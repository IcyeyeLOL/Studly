# Studly Backend

Express API with Clerk auth and Supabase. Used by the Studly mobile app.

## Setup

1. Copy env and add your keys:
   ```bash
   cp .env.example .env
   ```
   Fill in: `CLERK_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Optional: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `PORT`.

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
| POST | `/api/solve` | Get AI solution (question, subject, etc.) |
| POST | `/api/solve/stream` | Same as above but streams the response in real time (NDJSON: `{ "t": "chunk" }` then `{ "done": true, "answerText": "..." }`). |

All except `/api/health` require a valid Clerk Bearer token.

## Supabase

- Run the SQL from `mobile/SUPABASE_OUTLINE.md` (Phase 1.2) in the Supabase SQL Editor.
- Create Storage buckets: `avatars` (public), `attachments` (private).
