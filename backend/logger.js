// backend/logger.js
const pino = require('pino');

const level = process.env.LOG_LEVEL || 'info';
const base = { app: 'backend', service: 'backend', env: process.env.NODE_ENV || 'prod' };

// Always log to stdout
const streams = [{ stream: process.stdout }];

function normalizeHost(host) {
  if (!host) return host;
  // Remove any path like /loki/api/v1/push and trailing slashes
  try {
    const u = new URL(host);
    return `${u.protocol}//${u.host}`;
  } catch {
    // Fallback: trim trailing slash
    return host.replace(/\/+$/, '');
  }
}

let lokiStream;

// Optionally add a Loki stream if creds are present
if (process.env.LOKI_HOST && process.env.LOKI_USER && process.env.LOKI_TOKEN) {
  try {
    const { createWriteStream } = require('pino-loki');
    const lokiHost = normalizeHost(process.env.LOKI_HOST); // e.g. https://logs-prod-035.grafana.net

    lokiStream = createWriteStream({
      // IMPORTANT: base host only (no /loki/api/v1/push)
      host: lokiHost,
      basicAuth: {
        username: process.env.LOKI_USER,  // Grafana Cloud Logs tenant (e.g., 1345066)
        password: process.env.LOKI_TOKEN, // token with logs:write
      },
      // static labels (query with {app="backend"})
      labels: { app: 'backend', service: 'backend', env: base.env },

      // delivery behavior
      batching: true,
      interval: 1000,        // flush every 1s
      maxBatch: 1000,        // cap entries per batch
      timeout: 5000,         // network timeout
      // rejectUnauthorized: true, // default; leave true unless you have custom CA
    });

    streams.push({ stream: lokiStream });
    // eslint-disable-next-line no-console
    console.log('[logger] Loki transport enabled →', lokiHost);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[logger] Loki transport not enabled:', err?.message || err);
  }
} else {
  // eslint-disable-next-line no-console
  console.warn('[logger] Loki disabled: set LOKI_HOST, LOKI_USER, LOKI_TOKEN');
}

// Build the logger (multi-destination)
const logger = pino({ level, base }, pino.multistream(streams));

// Graceful flush on shutdown (so we don’t lose last logs)
function shutdown(code = 0) {
  try {
    if (lokiStream && typeof lokiStream.end === 'function') {
      lokiStream.end();
    }
  } catch {}
  try {
    // Flush pino’s internal streams
    if (logger.flush) logger.flush();
  } catch {}
  // Small delay to let async flush finish
  setTimeout(() => process.exit(code), 200).unref();
}
process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));

module.exports = logger;
