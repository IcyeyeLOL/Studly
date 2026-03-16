# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Studly** is an AI-powered homework help app. Students ask questions by subject (Math, Science, English, History), optionally attach images, and receive structured AI explanations in handwritten-style, flowchart, or text format. The stack is:

- **Backend**: Node.js + Express, deployed to Vercel (`https://studly-eosin.vercel.app`)
- **Mobile**: React Native (Expo), distributed via EAS Build (iOS + Android)
- **Auth**: Clerk (JWT on backend, `@clerk/clerk-expo` on mobile)
- **DB/Storage**: Supabase (Postgres + Storage buckets)
- **AI**: Anthropic Claude (`claude-sonnet-4-6` default)
- **Payments**: Stripe Checkout with deep-link redirects (`studly://subscription-success`)

## Commands

### Backend (`backend/`)

```bash
npm install          # Install dependencies
npm run dev          # Start with --watch (auto-restart on changes)
npm start            # Production start
```

Backend requires a `.env` file — copy `.env.example` and fill in values. Server starts on `PORT` (default 3001).

### Mobile (`mobile/`)

```bash
npm install          # Install dependencies
npx expo start       # Start Expo dev server
npx expo start --clear   # Clear Metro cache
```

For device testing: set `EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3001` in `.env`. Use `EXPO_PUBLIC_SKIP_ONBOARDING=true` to bypass onboarding during dev.

### EAS Builds

```bash
eas build --profile development --platform android
eas build --profile preview --platform all
eas build --profile production --platform all
```

## Architecture

### Backend (`backend/src/`)

- **`server.js`** — Entry point. Validates required env vars at startup (reports "set"/"missing", never logs values), then starts Express.
- **`app.js`** — Express setup. Middleware order matters: Stripe webhook raw-body handler must come **before** `express.json()`. Rate limiters are applied per-route.
- **`lib/env.js`** — Centralized env access. `SENSITIVE_KEYS` are never logged. `getAllowedOrigins()` parses comma-separated `ALLOWED_ORIGINS` for CORS.
- **`middleware/rateLimit.js`** — Per-route limits: global 200/15min, solve (AI) 40/15min, Stripe webhook 100/15min.
- **`routes/`** — Route handlers for: `solve`, `profile`, `saved-solutions`, `projects`, `recent-questions`, `upload`, `stripe`.

All routes (except `/api/health`) are protected by `clerkMiddleware()` from `@clerk/express`, which populates `req.auth.userId`.

### AI Solving Flow

1. Mobile POSTs to `/api/solve` or `/api/solve/stream` with `{question, subject, outputPreference, attachmentUrls, webSearch}` + Bearer token.
2. Backend enforces daily question limit (free: `FREE_DAILY_QUESTION_LIMIT` env var, default 10; pro: unlimited) and checks against Supabase `profiles.subscription_plan`.
3. Backend calls Anthropic with subject-specific pedagogical prompts (Math: step-by-step formulas; Science: cause-effect + analogies; English: PEE chain; History: 5 C's framework).
4. Streams NDJSON response back.
5. Mobile parses chunks in real-time via `XMLHttpRequest` in `services/api.js:solveStream()`.

**Dev fallback**: `services/solveDirect.js` calls Anthropic directly from the mobile app when the backend is unreachable. Requires `EXPO_PUBLIC_ANTHROPIC_API_KEY`. For development only — never use in production.

### Mobile State (`store/useStudlyStore.js`)

Zustand store persisted to AsyncStorage. Key state:
- `chats[]` — Chat threads with messages (the main data structure)
- `subscriptionPlan` — `"free" | "monthly" | "yearly"` (synced from backend on launch)
- `onboardingCompleted`, `tutorialSeen` — Controls first-run flows
- `defaultOutput` — User's preferred answer format

### Answer Rendering

Answers may contain embedded chart blocks: `[CHART type=bar] ... [/CHART]`. `utils/parseAnswerWithCharts.js` splits answer text into segments (text + chart data), and `components/ChartView.js` renders SVG charts (line, bar, area, pie, donut, scatter, barh) with animation.

### Payment Flow

1. Mobile calls `api.createCheckoutSession(plan)` → backend creates Stripe Checkout session → returns `{url}`.
2. Mobile opens URL in WebBrowser.
3. Stripe redirects to `studly://subscription-success` or `studly://subscription-cancel` (deep links).
4. Stripe webhook (`POST /api/webhooks/stripe`) updates `profiles.subscription_plan` in Supabase.

### Supabase Schema (key tables)

- `profiles` — `clerk_user_id`, `subscription_plan`, `stripe_customer_id`, `subscription_expires_at`, `appearance`, `default_output`
- `saved_solutions` — `user_id`, `question`, `subject`, `answer_text`, `output_preference`
- `projects` — `user_id`, `name`
- `recent_questions` — `user_id`, `title`, `subject`
- Storage: `avatars` (public), `attachments` (private, signed URLs)

## Environment Variables

### Backend (required)
- `CLERK_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### Backend (optional)
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default: `claude-sonnet-4-6`)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRODUCT_ID_PRO_MONTHLY`, `STRIPE_PRODUCT_ID_PRO_YEARLY`, `STRIPE_PRODUCT_ID_PRO_DISCOUNT`
- `ALLOWED_ORIGINS` — comma-separated CORS allowlist (set in production)
- `SERPER_API_KEY` — web search enrichment (serper.dev)
- `FREE_DAILY_QUESTION_LIMIT` — default `10`
- `PORT` — default `3001`

### Mobile (all prefixed `EXPO_PUBLIC_`)
- `CLERK_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `API_URL` — backend URL
- `STRIPE_PUBLISHABLE_KEY`
- `SKIP_ONBOARDING` — dev only, set `true` to skip onboarding
- `ANTHROPIC_API_KEY` — dev only, for `solveDirect.js` fallback

## Key Conventions

- Stripe webhook route must be registered **before** `express.json()` middleware in `app.js` (it needs raw body for signature verification).
- The `lib/env.js` module is the only place env vars are accessed on the backend — don't use `process.env` directly in route files.
- Mobile API calls always pass the Clerk Bearer token and check `response.ok` before parsing JSON.
- Subscription plan constants are centralized in `mobile/constants/plans.js`.
