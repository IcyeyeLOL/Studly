# Deploying Studly (Option 1: EAS Build + production API URL)

This guide gets your app ready for the App Store by deploying the **backend to Vercel** and building the **mobile app with EAS** using that API URL.

---

## Part A: Deploy the backend to Vercel

### 1. Prerequisites

- [Vercel account](https://vercel.com/signup) and [Vercel CLI](https://vercel.com/docs/cli) (optional but useful):
  ```bash
  npm i -g vercel
  vercel login
  ```
- Backend env vars ready: `ANTHROPIC_API_KEY`, `CLERK_SECRET_KEY` (or `CLERK_PUBLISHABLE_KEY` + secret), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Use the same names as in `backend/.env` for local.

### 2. Deploy from the repo (recommended)

1. Push your code to GitHub (if not already).
2. Go to [vercel.com/new](https://vercel.com/new).
3. **Import** your repository. Select the **Studly** repo.
4. **Configure the project:**
   - **Root Directory:** set to `backend` (so Vercel builds only the backend).
   - **Framework Preset:** leave as "Other" or "None".
   - **Build Command:** leave empty (or `npm run build` if you add one; not required).
   - **Output Directory:** leave empty.
5. **Environment Variables:** add all required keys (see above). Add them for **Production** (and optionally Preview).
6. Click **Deploy**. Wait for the build to finish.
7. Copy your deployment URL, e.g. `https://studly-backend-xxx.vercel.app`. This is your **production API URL**. Use it (no trailing slash) in Part B.

### 3. Deploy from CLI (alternative)

From the repo root:

```bash
cd backend
vercel
```

When prompted, link to your Vercel account and project. Set **Root Directory** to `backend` if you run from repo root, or run from inside `backend/` as above.

Add env vars in the [Vercel dashboard](https://vercel.com/dashboard) → your project → **Settings** → **Environment Variables**, then redeploy if needed.

### 4. Local backend (unchanged)

To run the backend locally (same as before):

```bash
cd backend
npm install
npm run start
```

This runs `src/server.js` and listens on `PORT` or 3001. Vercel uses `src/index.js` (which exports the Express app) when deployed.

---

## Part B: Point the app at your backend and build for the App Store

---

## Prerequisites (for Part B)

1. **Backend deployed** at a public HTTPS URL (from Part A).  
   Example: `https://studly-backend-xxx.vercel.app`

2. **Expo account** and EAS CLI:
   ```bash
   npm install -g eas-cli
   eas login
   ```

3. **Project linked** to EAS (one-time):
   ```bash
   cd mobile
   eas build:configure
   ```
   Use the existing `eas.json`; you can skip or merge when prompted.

---

## Step 1: Set the production API URL in EAS

So the app uses your real backend (not localhost), set the URL as an EAS **environment variable** for the **production** environment. It will be injected at build time.

```bash
cd mobile
eas env:create --name EXPO_PUBLIC_API_URL --value "https://YOUR-BACKEND-URL.com" --environment production --visibility plaintext --force
```

Replace `https://YOUR-BACKEND-URL.com` with your **Vercel backend URL** (no trailing slash), e.g.:

- `https://studly-backend-xxx.vercel.app`
- Or your custom domain if you added one in Vercel (e.g. `https://api.studly.app`)

**Optional – preview builds** (TestFlight/internal testing with a staging API):

```bash
eas env:create --name EXPO_PUBLIC_API_URL --value "https://YOUR-STAGING-URL.com" --environment preview --visibility plaintext --force
```

---

## Step 2: Build for production

**iOS (App Store / TestFlight):**

```bash
cd mobile
eas build --platform ios --profile production
```

**Android (Play Store):**

```bash
eas build --platform android --profile production
```

**Both:**

```bash
eas build --platform all --profile production
```

EAS will use the `production` profile and the `production` environment, so `EXPO_PUBLIC_API_URL` will be set during the build and baked into the app.

---

## Step 3: Submit to the stores (after build succeeds)

**iOS – App Store Connect / TestFlight:**

```bash
eas submit --platform ios --profile production
```

You’ll be prompted to pick the latest production build and to provide Apple ID / App Store Connect details if not already in `eas.json`.

**Android – Google Play:**

```bash
eas submit --platform android --profile production
```

---

## Summary

| Step | Command / action |
|------|-------------------|
| A1 | Deploy backend to Vercel (root directory: `backend`), add env vars, copy deployment URL |
| A2 | (Optional) Add custom domain in Vercel for a nicer API URL |
| B1 | `eas env:create --name EXPO_PUBLIC_API_URL --value "https://YOUR-VERCEL-URL.vercel.app" --environment production --visibility plaintext --force` |
| B2 | `eas build --platform ios --profile production` (and/or android) |
| B3 | `eas submit --platform ios --profile production` (and/or android) |

The app reads `EXPO_PUBLIC_API_URL` in `services/api.js`. EAS injects it when building with the `production` profile, so the built binary talks to your Vercel backend.

---

## Changing the API URL later

Update the EAS variable:

```bash
eas env:update --name EXPO_PUBLIC_API_URL --value "https://NEW-URL.com" --environment production --visibility plaintext
```

Then run a new production build; the new build will use the updated URL.

---

## Troubleshooting

- **App still hits localhost**  
  Make sure you ran `eas env:create` for **production** and that you’re building with `--profile production`. Local `npx expo start` uses your `.env` / `EXPO_PUBLIC_API_URL` on your machine, not EAS env.

- **Build fails / env not found**  
  Confirm the variable exists:  
  [expo.dev](https://expo.dev) → your project → **Environment variables** (or run `eas env:list`).

- **Clerk / Supabase**  
  Set any other needed env vars (e.g. `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`) the same way with `eas env:create` for the `production` (and optionally `preview`) environment so production builds have the right config.
