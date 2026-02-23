# Studly Backend

Express API with Clerk auth and Supabase. Used by the Studly mobile app.

## Setup

1. Copy env and add your keys:
   ```bash
   cp .env.example .env
   ```
   Fill in: `CLERK_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Optional: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `PORT`, `FREE_DAILY_QUESTION_LIMIT` (default 5 for free tier), `SERPER_API_KEY` (for web search — get at serper.dev). For Studly Pro: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, and optionally `STRIPE_PRICE_ID_PRO_MONTHLY`, `STRIPE_PRICE_ID_PRO_YEARLY`, `STRIPE_PRODUCT_ID_PRO_DISCOUNT` (or `STRIPE_PRICE_ID_PRO_DISCOUNT`) for the special-offer product; or use product IDs `STRIPE_PRODUCT_ID_PRO_MONTHLY`, `STRIPE_PRODUCT_ID_PRO_YEARLY` to look up prices.

## Switching AI models

Add to `backend/.env`:

```
ANTHROPIC_MODEL=claude-sonnet-4-6
```

Change the value to switch models. Examples:

| Model | Use case |
|-------|----------|
| `claude-sonnet-4-6` | Default (balanced speed and intelligence) |
| `claude-haiku-4-5` | Cheaper, faster |
| `claude-opus-4-6` | Strongest reasoning, more expensive |

See [Anthropic models](https://docs.anthropic.com/en/api/models-list) for available models.

2. Install and run:
   ```bash
   npm install
   npm run dev
   ```
   Server runs at `http://localhost:3001` (or your `PORT`).

## Auth

The mobile app must send the Clerk session token on each request:

```
Authorization: Bearer <token>
```

Get the token in the app with Clerk’s `getToken()` (e.g. from `useAuth()`) and set it in the `Authorization` header for all API calls.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check (no auth) |
| GET | `/api/profile` | Current user profile |
| PATCH | `/api/profile` | Update profile |
| GET | `/api/saved-solutions` | List saved solutions |
| POST | `/api/saved-solutions` | Create saved solution |
| DELETE | `/api/saved-solutions/:id` | Delete saved solution |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/recent-questions` | List recent questions |
| POST | `/api/recent-questions` | Add recent question |
| POST | `/api/upload/avatar` | Upload avatar (multipart) |
| POST | `/api/upload/attachment` | Upload attachment (multipart) |
| POST | `/api/stripe/create-checkout-session` | Create Stripe Checkout session for Studly Pro (body: `{ "plan": "monthly" \| "yearly" \| "discount" }`). Returns `{ url, sessionId }`. Use `discount` for the special-offer product (set `STRIPE_PRODUCT_ID_PRO_DISCOUNT` or `STRIPE_PRICE_ID_PRO_DISCOUNT`). |
| GET | `/api/stripe/redirect` | Redirects to app deep link `studly://subscription-success` or `studly://subscription-cancel` (used as Stripe success/cancel URL). |
| POST | `/api/webhooks/stripe` | Stripe webhook (raw body). Configure in Stripe Dashboard with signing secret in `STRIPE_WEBHOOK_SECRET`. |
| POST | `/api/solve` | Get AI solution (question, subject, etc.). Free tier: 5 questions/day (configurable via `FREE_DAILY_QUESTION_LIMIT`); Pro unlimited. |
| POST | `/api/solve/stream` | Same as above but streams the response in real time (NDJSON: `{ "t": "chunk" }` then `{ "done": true, "answerText": "..." }`). |

All except `/api/health` require a valid Clerk Bearer token.

## Supabase

- Run the SQL from `mobile/SUPABASE_OUTLINE.md` (Phase 1.2) in the Supabase SQL Editor. If you already have `profiles`, add: `alter table public.profiles add column if not exists stripe_customer_id text;`
- Create Storage buckets: `avatars` (public), `attachments` (private).
