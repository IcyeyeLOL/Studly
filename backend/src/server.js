/**
 * Local development: start the Express server with listen().
 * Run with: npm run start (or node src/server.js)
 */
import 'dotenv/config';
import { validateEnv } from './lib/env.js';
import app from './app.js';

// Validate required env (never log secret values)
validateEnv(
  ['CLERK_SECRET_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
  ['ANTHROPIC_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SERPER_API_KEY']
);

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Studly API running on http://0.0.0.0:${PORT} (LAN: use your PC IP + :${PORT})`);
});
