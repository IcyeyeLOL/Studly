/**
 * Rate limiters for all public and protected endpoints.
 * Limits are per IP. Use standardHeaders: 'draft-6' for RateLimit-* headers.
 */

import rateLimit from 'express-rate-limit';

const WINDOW_MS_15 = 15 * 60 * 1000;
const WINDOW_MS_1 = 60 * 1000;

/** Global: 200 requests per 15 min per IP for general API */
export const globalLimiter = rateLimit({
  windowMs: WINDOW_MS_15,
  max: 200,
  message: { error: 'Too many requests; try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Health check: 60/min (for load balancers / probes) */
export const healthLimiter = rateLimit({
  windowMs: WINDOW_MS_1,
  max: 60,
  message: { error: 'Too many health checks.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Solve (AI) endpoints: expensive; 40 per 15 min per IP */
export const solveLimiter = rateLimit({
  windowMs: WINDOW_MS_15,
  max: 40,
  message: { error: 'Too many solve requests; try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Stripe webhook: allow bursts from Stripe (e.g. 100 per 15 min) */
export const stripeWebhookLimiter = rateLimit({
  windowMs: WINDOW_MS_15,
  max: 100,
  message: { error: 'Too many webhook requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Stripe status/redirect: same as global */
export const stripePublicLimiter = rateLimit({
  windowMs: WINDOW_MS_15,
  max: 100,
  message: { error: 'Too many requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});
