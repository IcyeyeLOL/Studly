import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { clerkMiddleware } from '@clerk/express';
import { getAllowedOrigins } from './lib/env.js';
import {
  globalLimiter,
  healthLimiter,
  solveLimiter,
  stripeWebhookLimiter,
} from './middleware/rateLimit.js';
import { profileRouter } from './routes/profile.js';
import { savedSolutionsRouter } from './routes/saved-solutions.js';
import { projectsRouter } from './routes/projects.js';
import { recentQuestionsRouter } from './routes/recent-questions.js';
import { uploadRouter } from './routes/upload.js';
import { solveRouter } from './routes/solve.js';
import { checkoutRouter, stripeWebhookHandler } from './routes/stripe.js';

const app = express();

// Security headers (API-only; disable CSP that would block JSON responses)
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS: restrict origins in production via ALLOWED_ORIGINS env
const allowedOrigins = getAllowedOrigins();
app.use(
  cors({
    origin: Array.isArray(allowedOrigins) && allowedOrigins.length > 0
      ? (origin, cb) => {
          if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
          return cb(null, false);
        }
      : true,
    credentials: true,
  })
);

// Stripe webhook: rate limit then raw body then handler (must be before express.json())
app.use(
  '/api/webhooks/stripe',
  stripeWebhookLimiter,
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
);

// JSON body with size limit to reduce DoS via large payloads
app.use(express.json({ limit: '256kb' }));

// Global rate limit for all API routes below
app.use(globalLimiter);

// Health check (rate-limited, no auth)
app.get('/api/health', healthLimiter, (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.use(clerkMiddleware());

app.use('/api/profile', profileRouter);
app.use('/api/saved-solutions', savedSolutionsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/recent-questions', recentQuestionsRouter);
app.use('/api/upload', uploadRouter);
// Solve endpoints get stricter rate limit (expensive AI calls)
app.use('/api/solve', solveLimiter, solveRouter);
app.use('/api/stripe', checkoutRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;
