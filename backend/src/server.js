/**
 * Local development: start the Express server with listen().
 * Run with: npm run start (or node src/server.js)
 */
import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Studly API running on http://0.0.0.0:${PORT} (LAN: use your PC IP + :${PORT})`);
});
