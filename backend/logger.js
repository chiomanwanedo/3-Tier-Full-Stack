// backend/logger.js
const pino = require('pino');

const level = process.env.LOG_LEVEL || 'info';
const base = {
  app: 'backend',
  service: 'backend',
  env: process.env.NODE_ENV || 'prod',
};

// Always log to stdout
const streams = [{ stream: process.stdout }];

/**
 * Resolve pino-loki's createWriteStream across versions/export styles.
 * Returns a function or null if not found.
 */
function resolveCreateWriteStream() {
  try {
    const mod = require('pino-loki');
    if (mod && typeof mod.createWriteStream === 'function') return mod.createWriteStream;
    if (mod && mod.default && typeof mod.default.createWriteStream === 'function') {
      return mod.default.createWriteStream;
    }
    // Some versions export the factory directly
    if (typeof mod === 'function') return mod;
  } catch (e) {
    // fall through to null
  }
  return null;
}

/**
 * Normalize Loki host to base URL (no /loki/api/v1/push).
 */
function normalizeHost(raw) {
  if (!raw) return raw;
  return raw.replace(/\/loki\/api\/v1\/push\/?$/i, '');
}

/**
 * Optionally parse extra labels from env (JSON or key=value,key=value).
 */
function parseExtraLabels(input) {
  if (!input) return {};
  try {
    // Try JSON first
    return JSON.parse(input);
  } catch {
    // Fallback: key=value,key=value
    return input.split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .reduce((acc, pair) => {
        const idx = pair.indexOf('=');
        if (idx > 0) acc[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
        return acc;
      }, {});
  }
}

const LOKI_HOST = normalizeHost(process.env.LOKI_HOST);
const LOKI_USER = process.env.LOKI_USER;   // numeric tenant/instance id (e.g., 1345066)
const LOKI_TOKEN = process.env.LOKI_TOKEN; // access policy token with logs:write
const EXTRA_LABELS = parseExtraLabels(process.env.LOKI_LABELS || '');

if (LOKI_HOST && LOKI_USER && LOKI_TOKEN) {
  const createWriteStream = resolveCreateWriteStream();
  if (typeof createWriteStream === 'function') {
    try {
      const lokiStream = createWriteStream({
        // IMPORTANT: base host only, e.g. https://logs-prod-035.grafana.net
        host: LOKI_HOST,
        basicAuth: {
          username: LOKI_USER,
          password: LOKI_TOKEN,
        },
        labels: { app: 'backend', service: 'backend', env: base.env, ...EXTRA_LABELS },
        batching: true,
        interval: 1000, // flush every 1s
        timeout: 5000,
      });

      streams.push({ stream: lokiStream });
      // eslint-disable-next-line no-console
      console.log('[logger] Loki transport enabled →', LOKI_HOST);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[logger] Loki transport not enabled:', err?.message || err);
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn('[logger] Loki transport not enabled: createWriteStream export not found (check pino-loki version)');
  }
} else {
  // eslint-disable-next-line no-console
  console.log('[logger] Loki disabled: set LOKI_HOST, LOKI_USER, LOKI_TOKEN');
}

// Build the logger (multi-destination)
const logger = pino({ level, base }, pino.multistream(streams));

module.exports = logger;
