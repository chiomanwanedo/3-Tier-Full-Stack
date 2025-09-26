// backend/logger.js
const pino = require('pino');

const level = process.env.LOG_LEVEL || 'info';
const base = { app: 'backend', service: 'backend', env: process.env.NODE_ENV || 'prod' };

// Always log to stdout
const streams = [{ stream: process.stdout }];

// Optionally add a Loki stream if creds are present
if (process.env.LOKI_HOST && process.env.LOKI_USER && process.env.LOKI_TOKEN) {
  try {
    // npm i pino pino-loki
    const { createWriteStream } = require('pino-loki');
    const lokiStream = createWriteStream({
      // IMPORTANT: base host only, e.g. https://logs-prod-035.grafana.net (NO /loki/api/v1/push here)
      host: process.env.LOKI_HOST,
      basicAuth: {
        username: process.env.LOKI_USER,   // Grafana Cloud Logs instance ID (numbers)
        password: process.env.LOKI_TOKEN,  // Logs:write token
      },
      labels: { app: 'backend', service: 'backend', env: base.env },
      batching: true,
      interval: 1000, // flush every 1s
    });
    streams.push({ stream: lokiStream });
    // eslint-disable-next-line no-console
    console.log('[logger] Loki transport enabled');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[logger] Loki transport not enabled:', err?.message || err);
  }
}

// Build the logger (multi-destination)
const logger = pino(
  { level, base },
  pino.multistream(streams)
);

module.exports = logger;
