/**
 * Centralized env access and startup validation.
 * Never log secret values; only report "set" or "missing".
 */

const SENSITIVE_KEYS = new Set([
  'CLERK_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SERPER_API_KEY',
]);

/**
 * Get env var; optional trim. Never use for logging.
 */
export function getEnv(key, options = {}) {
  const raw = process.env[key];
  const value = options.trim !== false && typeof raw === 'string' ? raw.trim() : raw;
  return value || undefined;
}

/**
 * Check if a sensitive key is present (for startup validation only).
 * Returns true if set and non-empty.
 */
export function hasSecret(key) {
  const v = getEnv(key);
  return typeof v === 'string' && v.length > 0;
}

/**
 * Validate required env for server startup. Logs only "set" or "missing", never values.
 * Throws if required keys are missing (so server won't start with bad config).
 */
export function validateEnv(required = [], optional = []) {
  const missing = [];
  for (const key of required) {
    if (!getEnv(key)) missing.push(key);
  }
  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(', ')}. Add them to .env (see .env.example).`);
  }
  const all = [...required, ...optional];
  for (const key of all) {
    if (SENSITIVE_KEYS.has(key)) {
      const status = hasSecret(key) ? 'set' : 'missing';
      if (required.includes(key) && status === 'missing') continue; // already thrown
      console.log(`[env] ${key}: ${status}`);
    }
  }
}

/**
 * Get allowed CORS origins from env. Defaults to "*" only in development.
 * Production should set ALLOWED_ORIGINS=https://yourapp.com,https://admin.yourapp.com
 */
export function getAllowedOrigins() {
  const raw = getEnv('ALLOWED_ORIGINS');
  if (raw) {
    return raw.split(',').map((o) => o.trim()).filter(Boolean);
  }
  return process.env.NODE_ENV === 'production' ? [] : undefined; // undefined => cors can reflect or use default
}
