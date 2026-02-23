# Studly

**Homework → solutions.** Studly is an AI-powered study assistant that helps high school and college students get clear, step-by-step explanations and solutions—in normal text, handwritten-style, or flowchart form.

---

## What it does

- **Ask questions** — Paste or type a question, pick a subject (Math, English, Science, History, etc.), and get a teaching-style answer tailored to how you learn.
- **Multiple output styles** — Choose how solutions are shown: normal text, handwritten-style steps, or flowchart-style steps.
- **Attach context** — Add photos or files (e.g. problem sets, diagrams) so the AI can use them in the answer.
- **Chat threads** — Keep related Q&amp;As in chats, star important ones, and revisit them from the sidebar.
- **Save solutions** — Save any answer to your Saved list for quick access later.
- **Projects** — Organize work by project (e.g. by class or assignment).
- **Onboarding** — Short onboarding captures your struggles and goals so answers can be more relevant.
- **Studly Pro** — In-app billing concept (monthly/yearly) for future premium features.

The app tries the backend first for solving; if the backend isn’t reachable (e.g. no tunnel), it can fall back to direct AI calls when configured for development.

---

## Who it’s for

- High school and college students who want to **understand** answers, not just copy them.
- Anyone who prefers structured, step-by-step explanations with optional handwritten or flowchart layouts.

---

## Skills

- **Full-stack development** — React Native (Expo) mobile app and Node.js/Express REST API.
- **Auth & identity** — Clerk integration (sign-in, sign-up, session tokens, profile sync).
- **Backend & data** — Supabase (Postgres, RLS-friendly queries, Storage for avatars and attachments).
- **AI integration** — Anthropic Claude API; subject-specific and format-specific prompts; optional client fallback when backend is unreachable.
- **State & persistence** — Zustand with AsyncStorage; chat threads, saved solutions, projects, and user preferences.
- **UX** — Onboarding flow, theme (light/dark), sidebar navigation, modals, and responsive layout.
- **API design** — RESTful routes, auth middleware, health check, and clear request/response contracts.

---

## Deliverables

| Deliverable | Description |
|-------------|-------------|
| **Mobile app** | Cross-platform (iOS/Android) Expo app: auth, onboarding, chat, solve flow, projects, saved solutions, profile/settings. |
| **Backend API** | Express server: profile, solve, upload (avatar/attachment), projects, saved solutions, recent questions; Clerk auth on all protected routes. |
| **Database & storage** | Supabase project: `profiles`, `saved_solutions`, `projects`, `recent_questions`; Storage buckets for avatars and attachments. |
| **Documentation** | Root README (project description, skills, deliverables); backend README (setup, env, API table). |
| **Deployable artifacts** | Backend runnable via `npm run dev`; mobile runnable via `expo start`; env-based configuration for both. |

---

## Tech stack

| Part    | Stack |
|--------|--------|
| **Mobile** | Expo (React Native), Clerk (auth), Zustand (state + persist), NativeWind (Tailwind-style styling) |
| **Backend** | Node.js, Express, Clerk, Supabase (Postgres + Storage), Anthropic (Claude) |
| **Auth** | Clerk; mobile sends Bearer token; backend resolves to a Supabase profile per user |

---

## Repo structure

```
Studly/
├── backend/          # Express API (auth, profile, solve, upload, projects, saved solutions)
│   ├── src/
│   │   ├── index.js
│   │   ├── lib/supabase.js
│   │   ├── middleware/requireAuth.js
│   │   └── routes/
│   └── README.md     # Setup, env, API table
├── mobile/           # Expo app (screens, solve flow, sidebar, settings)
│   ├── App.js
│   ├── services/    # api.js, solveDirect.js
│   ├── store/        # Zustand (chats, saved, projects, profile)
│   ├── screens/      # Auth, onboarding, Chat, Projects, Saved, Profile
│   └── components/
└── README.md         # This project description
```

---

## Getting started

1. **Backend**  
   See [backend/README.md](backend/README.md). You need Clerk keys, Supabase URL + service key, and optionally an Anthropic API key. Run SQL for tables and create Storage buckets (`avatars`, `attachments`).

2. **Mobile**  
   From `mobile/`: `npm install`, then `npx expo start`. Set `EXPO_PUBLIC_API_URL` (and optionally `EXPO_PUBLIC_ANTHROPIC_API_KEY` for direct AI when the backend is unreachable). Use `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (or app config) for Clerk.

3. **Run**  
   Start the backend (e.g. `npm run dev` in `backend/`), then run the app on a device or simulator. Sign in with Clerk and complete onboarding to reach the main Chat screen.

### QR code: "No usable data found"

That message usually appears when you scan the Expo QR code with your **phone’s Camera app** instead of **Expo Go**. The QR encodes an `exp://` URL that only Expo Go knows how to open.

- **Fix:** Open the **Expo Go** app on your phone, then use **Expo Go’s built-in “Scan QR code”** (e.g. from the home screen or “Enter URL manually” and type the URL from the terminal).
- **Same Wi‑Fi:** Phone and computer must be on the same Wi‑Fi for the default (LAN) URL to work. If they’re not, run `npx expo start --tunnel` in `mobile/` and scan the new QR code **inside Expo Go**.
- **Android:** In Expo Go, tap “Scan QR code” and point at the terminal QR.
- **iOS:** You can sometimes scan from the Camera app and get “Open in Expo Go”—if you see “no usable data,” use Expo Go’s scanner instead.

---

## License

Private / unlicensed unless otherwise specified.
