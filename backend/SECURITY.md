# Security Audit & Hardening (Studly Backend)

This document summarizes the security audit and the measures implemented to limit breaches, enforce rate limiting, and secure API key handling.

---

## 1. Audit Summary

### 1.1 Authentication & Authorization
- **Clerk** is used for auth; `requireAuth` middleware ensures all protected routes have a valid Clerk session and a Supabase profile.
- **Stripe webhook** uses signature verification (`stripe.webhooks.constructEvent`) with `STRIPE_WEBHOOK_SECRET`; raw body is required and is mounted separately in `app.js`.
- **Profile PATCH** allows only a fixed allowlist of fields (`display_name`, `profile_image_url`, etc.); no mass assignment.

### 1.2 API Keys & Secrets
- **Secrets** are read from `process.env` (via `.env`); `.env` is in `.gitignore` and must never be committed.
- **No secrets** are logged in application code; startup validation reports only “set” or “missing” for sensitive keys.
- **Required at startup**: `CLERK_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Optional: `ANTHROPIC_API_KEY`, `STRIPE_*`, `SERPER_API_KEY`.

### 1.3 Input & Output
- **Solve** endpoints: `question` required, max length 10,000 characters; `attachment_urls` and other fields validated/sanitized.
- **Upload**: Multer limits 5 MB; allowlisted MIME types and file extensions; avatar and attachment buckets separated.
- **JSON body** limit set to 256 KB globally to reduce DoS via large payloads.

### 1.4 Dependencies
- Run `npm audit` regularly and address high/critical findings. Consider `npm audit fix` (review diff) or updating specific packages.

---

## 2. Implemented Hardening

### 2.1 Rate Limiting (All Public & Protected Endpoints)
- **Global**: 200 requests per 15 minutes per IP for general API routes.
- **Health** (`GET /api/health`): 60 requests per minute per IP.
- **Solve** (`POST /api/solve`, `POST /api/solve/stream`): 40 requests per 15 minutes per IP (expensive AI calls).
- **Stripe webhook** (`POST /api/webhooks/stripe`): 100 requests per 15 minutes per IP (allows Stripe bursts).
- Responses send standard `RateLimit-*` headers; when exceeded, JSON `{ error: "Too many requests; try again later." }` with 429.

### 2.2 Secure API Key Handling
- **Centralized env** (`src/lib/env.js`): `getEnv()`, `hasSecret()`, `validateEnv()`, `getAllowedOrigins()`.
- **Startup validation** (`src/server.js`): Ensures required env vars are present; logs only “set”/“missing” for sensitive keys, never values.
- **.env.example**: Template with placeholder names only; no real keys. Copy to `.env` and fill in secrets locally or in your host’s env (e.g. Vercel).

**Recommendations:**
- Rotate any key that may have been committed or shared (Clerk, Supabase, Anthropic, Stripe, Serper).
- Use different keys per environment (e.g. test vs live Stripe keys).
- Prefer your host’s secret manager (e.g. Vercel Environment Variables) over committing `.env`.

### 2.3 Security Headers & CORS
- **Helmet** is used with safe defaults for an API: `contentSecurityPolicy` disabled (API returns JSON), `crossOriginResourcePolicy: 'cross-origin'`.
- **CORS**: In production, set `ALLOWED_ORIGINS` to a comma-separated list of allowed origins (e.g. `https://yourapp.com`). If unset, CORS allows all origins (preserves existing behavior). Credentials are allowed for cookie/session use if needed.

### 2.4 Other Protections
- **Body size**: `express.json({ limit: '256kb' })` to mitigate large-body DoS.
- **Stripe webhook**: Rate limited, then raw body parser, then signature verification; invalid signature returns 400 and no internal state is updated.

---

## 3. Endpoint Overview

| Endpoint | Auth | Rate limit |
|----------|------|------------|
| `GET /api/health` | No | 60/min per IP |
| `POST /api/webhooks/stripe` | No (verified by signature) | 100/15min per IP |
| `GET /api/stripe/status`, `GET /api/stripe/redirect` | No | Global (200/15min) |
| All other `/api/*` | Yes (Clerk) | Global; `/api/solve` additionally 40/15min |

---

## 4. Checklist for Deployments

- [ ] `.env` is never committed; use `.env.example` as a template.
- [ ] Required env vars set: `CLERK_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] In production, set `ALLOWED_ORIGINS` to your frontend origin(s).
- [ ] Stripe webhook URL and `STRIPE_WEBHOOK_SECRET` match Stripe Dashboard.
- [ ] Run `npm audit` and fix or accept risks for vulnerabilities.
- [ ] Rotate secrets if they may have been exposed.

---

## 5. Optional Next Steps

- **Per-user rate limits**: Use `req.auth?.userId` (or profile id) in a custom rate-limit key for stricter per-user caps on solve/upload.
- **Audit logging**: Log security-relevant events (e.g. failed auth, webhook failures) to a dedicated log or SIEM, without logging tokens or full request bodies.
- **HTTPS only**: Ensure production is behind TLS; Helmet can enforce HSTS if you add it.
