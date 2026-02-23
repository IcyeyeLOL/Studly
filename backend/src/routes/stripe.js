/**
 * Stripe: create-checkout-session, redirect, and webhook.
 * Webhook route must be mounted with raw body (see app.js).
 */

import { Router } from 'express';
import Stripe from 'stripe';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/requireAuth.js';

const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
let stripe = null;
if (stripeKey && stripeKey.startsWith('sk_')) {
  try {
    stripe = new Stripe(stripeKey);
  } catch (err) {
    console.error('Stripe init failed:', err.message);
  }
}
if (!stripe) {
  console.warn('Stripe not configured: STRIPE_SECRET_KEY missing or invalid (must start with sk_test_ or sk_live_)');
}

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET?.trim();
const PRICE_MONTHLY = process.env.STRIPE_PRICE_ID_PRO_MONTHLY?.trim();
const PRICE_YEARLY = process.env.STRIPE_PRICE_ID_PRO_YEARLY?.trim();
const PRODUCT_MONTHLY = process.env.STRIPE_PRODUCT_ID_PRO_MONTHLY?.trim();
const PRODUCT_YEARLY = process.env.STRIPE_PRODUCT_ID_PRO_YEARLY?.trim();

function getBaseUrl(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  return `${proto}://${host}`;
}

/**
 * Resolve Stripe Price ID for plan. Uses env STRIPE_PRICE_ID_* if set;
 * otherwise fetches prices for the product and picks the recurring price.
 */
async function getPriceId(plan) {
  const isYearly = plan === 'yearly';
  const priceId = isYearly ? PRICE_YEARLY : PRICE_MONTHLY;
  if (priceId) return priceId;
  const productId = isYearly ? PRODUCT_YEARLY : PRODUCT_MONTHLY;
  if (!stripe || !productId) return null;
  const { data } = await stripe.prices.list({ product: productId, active: true });
  const recurring = data.find((p) => p.recurring && (isYearly ? p.recurring.interval === 'year' : p.recurring.interval === 'month'));
  return recurring?.id ?? data[0]?.id ?? null;
}

// ─── Create Checkout Session (auth required) ─────────────────────────────
const checkoutRouter = Router();

// Diagnostic: GET /api/stripe/status (no auth) — check if Stripe is configured
checkoutRouter.get('/status', (req, res) => {
  res.json({
    stripeConfigured: !!stripe,
    hasWebhookSecret: !!WEBHOOK_SECRET,
    hasProductMonthly: !!PRODUCT_MONTHLY,
    hasProductYearly: !!PRODUCT_YEARLY,
  });
});

checkoutRouter.post('/create-checkout-session', requireAuth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to your environment (Vercel: Dashboard → Settings → Environment Variables).',
    });
  }

  const plan = req.body.plan === 'yearly' ? 'yearly' : 'monthly';
  const priceId = await getPriceId(plan);
  if (!priceId) {
    return res.status(400).json({ error: 'Invalid plan or missing Stripe price. Set STRIPE_PRICE_ID_PRO_MONTHLY and STRIPE_PRICE_ID_PRO_YEARLY (or product IDs).' });
  }

  const baseUrl = getBaseUrl(req);
  const successUrl = `${baseUrl}/api/stripe/redirect?success=1&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/api/stripe/redirect?success=0`;

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, display_name, stripe_customer_id')
      .eq('id', req.profileId)
      .single();

    if (profileError) {
      console.error('Stripe checkout profile lookup error:', profileError.message);
      return res.status(500).json({ error: 'Profile not found' });
    }
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    let customerId = profile.stripe_customer_id || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email || undefined,
        name: profile.display_name || undefined,
        metadata: { profile_id: profile.id, clerk_user_id: req.clerkUserId },
      });
      customerId = customer.id;
      const { error: custErr } = await supabase
        .from('profiles')
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.profileId);
      if (custErr) console.error('Failed to save stripe_customer_id:', custErr.message);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { profile_id: req.profileId },
      subscription_data: { metadata: { profile_id: req.profileId } },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message || 'Failed to create checkout session' });
  }
});

// ─── Redirect (no auth): redirect browser to app deep link ─────────────────
checkoutRouter.get('/redirect', (req, res) => {
  const success = req.query.success === '1';
  const sessionId = (req.query.session_id || '').trim();
  const params = new URLSearchParams();
  if (sessionId) params.set('session_id', sessionId);
  const qs = params.toString();
  const path = success ? 'subscription-success' : 'subscription-cancel';
  const url = qs ? `studly://${path}?${qs}` : `studly://${path}`;
  res.redirect(302, url);
});

export { checkoutRouter };

// ─── Webhook (raw body; mounted separately in app.js) ─────────────────────
export function stripeWebhookHandler(req, res) {
  if (!stripe || !WEBHOOK_SECRET) {
    return res.status(503).send('Stripe webhook not configured');
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).send('Missing stripe-signature');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  (async () => {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription' || !session.subscription) break;
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        const price = sub.items?.data?.[0]?.price;
        const interval = price?.recurring?.interval;
        const plan = interval === 'year' ? 'yearly' : 'monthly';
        const profileId = session.metadata?.profile_id || sub.metadata?.profile_id;
        if (!profileId) break;
        const { error: checkoutErr } = await supabase
          .from('profiles')
          .update({
            subscription_plan: plan,
            subscription_expires_at: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', profileId);
        if (checkoutErr) console.error('Webhook: failed to update subscription after checkout:', checkoutErr.message);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const profileId = sub.metadata?.profile_id;
        if (!profileId) break;
        const plan = sub.status === 'active' ? (sub.items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly') : 'free';
        const expiresAt = sub.status === 'active' && sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;
        const { error: subErr } = await supabase
          .from('profiles')
          .update({
            subscription_plan: plan,
            subscription_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profileId);
        if (subErr) console.error('Webhook: failed to update subscription status:', subErr.message);
        break;
      }
      default:
        break;
    }
  })().catch((err) => console.error('Stripe webhook handler error:', err));

  res.sendStatus(200);
}
