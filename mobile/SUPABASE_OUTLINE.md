# Studly → Supabase: Implementation Outline

Use this as a checklist. Order matters for dependencies.

---

## Phase 1: Supabase project & schema

### 1.1 Create Supabase project
- [ ] Sign up at [supabase.com](https://supabase.com) and create a new project.
- [ ] Note: **Project URL**, **anon key**, and **service role key** (keep service role server-only).
- [ ] Add to `.env` (and `.env.example` without real values):
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - (Backend only: `SUPABASE_SERVICE_ROLE_KEY`)

### 1.2 Database schema (run in SQL Editor or migrations)

```sql
-- Extensions if needed
-- create extension if not exists "uuid-ossp";

-- Users/profiles (synced with Clerk; use Clerk user id as primary link)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  email text,
  display_name text,
  profile_image_url text,
  appearance text default 'light' check (appearance in ('light', 'dark')),
  default_output text default 'ask' check (default_output in ('ask', 'handwritten', 'flowchart')),
  notifications_enabled boolean default true,
  onboarding_data jsonb default '{}',
  subscription_plan text default 'free',
  subscription_expires_at timestamptz,
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_clerk_user_id on public.profiles(clerk_user_id);

-- Saved solutions
create table if not exists public.saved_solutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  subject text not null default 'Other',
  answer_text text,
  output_preference text default 'handwritten',
  created_at timestamptz default now()
);

create index if not exists idx_saved_solutions_user_id on public.saved_solutions(user_id);
create index if not exists idx_saved_solutions_created_at on public.saved_solutions(created_at desc);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Untitled',
  created_at timestamptz default now()
);

create index if not exists idx_projects_user_id on public.projects(user_id);

-- Recent questions (optional; can also store as jsonb on profiles)
create table if not exists public.recent_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  subject text not null default 'Other',
  created_at timestamptz default now()
);

create index if not exists idx_recent_questions_user_id on public.recent_questions(user_id);
create index if not exists idx_recent_questions_created_at on public.recent_questions(created_at desc);
```

### 1.3 Row Level Security (RLS)
- [ ] Enable RLS on all tables: `alter table public.profiles enable row level security;` (and same for other tables).
- [ ] Policies: users can only read/write their own rows. You’ll need a way to get `user_id` from the request (e.g. JWT custom claim or a `profiles.id` lookup by `clerk_user_id`). Option A: store `clerk_user_id` in JWT and use a DB function that returns `profiles.id` for that Clerk id; policies use that. Option B: use Supabase Auth and link Clerk later (more work). Document your chosen approach in this file.

### 1.4 Storage buckets
- [ ] Create bucket **avatars** (or `profile-images`): public read, authenticated upload; max file size ~2MB.
- [ ] Create bucket **attachments**: private; signed URLs for upload/download; for question attachments (images, PDFs). Set lifecycle if needed.

---

## Phase 2: Backend API (Clerk + Supabase)

### 2.1 Where the API lives
- [ ] Decide: **Next.js API routes** (e.g. in a `backend/` or `api/` Next app) or **standalone Node/Express** or **serverless (e.g. Vercel/Netlify functions)**. Same repo or separate repo is fine.

### 2.2 Auth: Clerk JWT → Supabase
- [ ] Install: `@clerk/backend` (or Next.js `@clerk/nextjs`) and `@supabase/supabase-js`.
- [ ] Every protected route: verify Clerk JWT, read `userId` (Clerk user id).
- [ ] Map Clerk `userId` → `profiles.id`: either query `profiles` by `clerk_user_id` or use a Supabase RPC that takes Clerk id and returns `profiles.id` for RLS.

### 2.3 Profile sync (Clerk → Supabase)
- [ ] **Option A – Webhooks:** Add Clerk webhook endpoint (e.g. `POST /api/webhooks/clerk`). On `user.created` / `user.updated`: upsert into `profiles` (by `clerk_user_id`). On `user.deleted`: delete or soft-delete row.
- [ ] **Option B – Lazy sync:** On first API request after sign-in, get user from Clerk API and upsert `profiles`. Simpler but no sync on delete until they hit your API again.
- [ ] Store: `clerk_user_id`, `email`, `display_name`, `profile_image_url`, and optionally `onboarding_data` from the app.

### 2.4 API endpoints to implement

| Endpoint | Method | Purpose |
|----------|--------|--------|
| `GET /api/me` or `GET /api/profile` | GET | Return current user’s profile (from `profiles`). |
| `PATCH /api/profile` | PATCH | Update display_name, profile_image_url, appearance, default_output, notifications_enabled, onboarding_data. |
| `GET /api/saved-solutions` | GET | List saved solutions for user (paginated). |
| `POST /api/saved-solutions` | POST | Create saved solution (question, subject, answer_text, output_preference). |
| `DELETE /api/saved-solutions/:id` | DELETE | Delete one saved solution (must belong to user). |
| `GET /api/projects` | GET | List projects for user. |
| `POST /api/projects` | POST | Create project (name). |
| `PATCH /api/projects/:id` | PATCH | Update project name. |
| `DELETE /api/projects/:id` | DELETE | Delete project (must belong to user). |
| `GET /api/recent-questions` | GET | List recent questions (limit 20). |
| `POST /api/recent-questions` | POST | Add recent question (title, subject). Optionally trim to last 20. |
| `POST /api/upload/avatar` | POST | Accept image, upload to Supabase Storage `avatars`, return URL; update `profiles.profile_image_url`. |
| `POST /api/upload/attachment` | POST | Accept file, upload to `attachments`, return signed URL or key; use when sending to solve endpoint. |
| `POST /api/solve` | POST | Body: question, subject, attachment_urls (optional), output_preference. Call AI (e.g. Claude API), return solution; optionally save to `saved_solutions` and append to recent_questions. Enforce subscription and rate limits here. |

### 2.5 Subscription / paywall
- [ ] Decide: Stripe, RevenueCat, or other. Store plan and expiry in `profiles` (`subscription_plan`, `subscription_expires_at`).
- [ ] Webhook from payment provider → update `profiles`. In `POST /api/solve` (and any premium endpoints), check subscription before calling AI.

---

## Phase 3: Mobile app changes

### 3.1 Install Supabase in the app
- [ ] `npx expo install @supabase/supabase-js`.
- [ ] Create a Supabase client module (e.g. `lib/supabase.js` or `utils/supabase.js`): use `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. For authenticated requests, pass the Clerk session token (see 3.2).

### 3.2 Auth: pass Clerk token to Supabase
- [ ] Supabase can accept a custom JWT. Option A: set Supabase anon key and use your API as a proxy for all DB access (app calls your API with Clerk token; API uses service role or a user-scoped Supabase client). Option B: use Supabase Auth and sync Clerk ↔ Supabase Auth (more setup). **Recommended for simplicity:** app does **not** talk to Supabase directly for DB; app only calls **your backend API** with Clerk token; backend uses Supabase server-side. Then you don’t need to pass Clerk JWT into Supabase from the client.

### 3.3 Replace local state with API + cache
- [ ] **Profile:** On app load (when signed in), `GET /api/profile`. Write into Zustand (and optionally persist to AsyncStorage as cache). On profile edit, `PATCH /api/profile` then update store.
- [ ] **ClerkUserSync:** After Clerk user loads, call `PATCH /api/profile` to sync name/email/image to Supabase (or rely on webhook). Keep ClerkUserSync for local store display name.
- [ ] **Saved solutions:** Replace `savedSolutions` in store with fetch from `GET /api/saved-solutions`. Add/remove via `POST` / `DELETE`. Keep a copy in Zustand for UI; refetch after mutations.
- [ ] **Projects:** Same idea: `GET /api/projects`, then `POST /api/projects`, `PATCH`, `DELETE` as in the app today.
- [ ] **Recent questions:** `GET /api/recent-questions`, `POST` when user submits a question (e.g. in `onSolve`).
- [ ] **Onboarding:** Already syncing to store; add `PATCH /api/profile` with `onboarding_data` when they finish paywall (and optionally on each step if you want server-side backup).

### 3.4 Solve flow (real AI)
- [ ] Replace mock `onSolve` in AskScreen with:
  - Upload attachments (if any) to `POST /api/upload/attachment`, get URLs.
  - Call `POST /api/solve` with question, subject, attachment_urls, output_preference.
  - Show loading; on success, display result and optionally “Save” which calls `POST /api/saved-solutions`.
- [ ] Add `POST /api/recent-questions` when a question is submitted (or let the backend do it in `POST /api/solve`).

### 3.5 Profile image
- [ ] Upload: use `POST /api/upload/avatar` (or pick image → upload to Supabase Storage from app with signed upload URL if you expose that). Set returned URL in profile and in store.

### 3.6 Offline / persistence
- [ ] Keep Zustand + AsyncStorage as **cache**: after fetching profile/solutions/projects, write to store (and persist). On launch, show cache first, then refetch and update. Handle “no network” gracefully (show cached data, queue writes if you want).

---

## Phase 4: Polish & scale

### 4.1 Errors and loading
- [ ] Global error handling for API calls (e.g. 401 → sign out, 5xx → retry or message).
- [ ] Loading states for all lists and for solve.

### 4.2 Rate limiting and abuse
- [ ] In backend, rate limit by Clerk `userId` (e.g. per minute/hour). Optionally use Redis (Upstash/Vercel KV) for counters.
- [ ] Enforce subscription in `POST /api/solve`: free tier = N questions/day; Pro = higher or unlimited.

### 4.3 Backups and env
- [ ] Supabase: enable point-in-time recovery if available for your plan.
- [ ] Keep `.env` out of git; document all env vars in `.env.example` and in this outline.

---

## Quick reference: env vars

| Variable | Where | Purpose |
|----------|--------|--------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | App | Clerk (existing). |
| `EXPO_PUBLIC_SUPABASE_URL` | App | Supabase project URL. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | App | Supabase anon key (if you ever call Supabase from the app). |
| `CLERK_SECRET_KEY` | Backend | Verify Clerk JWTs. |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Server-side Supabase client (bypasses RLS). |
| `ANTHROPIC_API_KEY` or your AI key | Backend | For `POST /api/solve`. |

---

## File changes (high level)

- **New:** Backend API (Next.js or Node) with routes above; Supabase client; Clerk auth middleware.
- **New:** `mobile/lib/supabase.js` or `mobile/utils/supabase.js` (if you call Supabase from app).
- **New:** `mobile/services/api.js` (or similar): functions that call your backend with Clerk token (from `useAuth().getToken()` or equivalent).
- **Modify:** `store/useStudlyStore.js` – keep shape; fill from API and persist as cache; trigger API on mutations.
- **Modify:** AskScreen solve flow → call API; profile screens → PATCH profile; Saved/Projects → use API.
- **Modify:** ClerkUserSync – optionally trigger profile sync to backend after sign-in.

You can tick off items in this outline as you go and add notes (e.g. “RLS policy used: …”) under each phase.
