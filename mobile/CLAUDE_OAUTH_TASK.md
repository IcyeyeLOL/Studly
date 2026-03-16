# Claude Task: Implement Universal OAuth Login

You need to implement Universal OAuth Login (Google & Apple) for Studly's mobile app, specifically focusing on the onboarding flow and other auth screens. The user has provided detailed requirements.

**IMPORTANT: Do NOT completely replace the existing UI style.** Keep the current UI for the sign-in page, but add the Apple and Google sign-in options above the email login.

## Requirements

1. **Onboarding Flow Sequence:**
   - The user finishes the onboarding questions and lands on the "Your custom plan is ready" screen (`PlanReadyStep`).
   - The user clicks **"Save my plan"**.
   - It redirects them to a Login/Sign Up screen (the `SaveProgressStep`).
   - On this screen, they should see "Sign in with Apple" and "Sign in with Google" buttons. Underneath these, there should be an option to sign in with Email.
   - **Crucial:** After the user creates an account or signs in successfully on this screen, it MUST redirect them to the payment plan page (`PaywallStep.js`) where they can pay to use the app.

2. **Universal Login:**
   - The "Sign in with Apple" and "Sign in with Google" options must also appear seamlessly on the standard `AuthLandingScreen`, `SignInScreen`, and `SignUpScreen`.
   - The UI style of these screens should remain largely intact, except for the addition of the new OAuth buttons.

3. **Authentication Provider:**
   - You MUST use **Clerk** for this integration (`useOAuth`).

4. **Accurate Logos:**
   - The Apple and Google buttons MUST use the exact, accurate, official logos. 
   - Google should use the standard 4-color "G" logo SVG.
   - Apple should use the standard Apple logo SVG (white or black depending on the theme contrast).
   - Do not use weird-looking generic icons. Use the exact SVGs.

## Implementation Details

- You may want to create a reusable `<OAuthButtons />` component to hold the Google and Apple buttons so it can be placed across `AuthLandingScreen.js`, `SignInScreen.js`, `SignUpScreen.js`, and `SaveProgressStep.js`.
- Make sure `SaveProgressStep.js` correctly handles the `setActive` session from the Clerk OAuth flow and navigation (`navigation.replace('OB_Paywall')`).
