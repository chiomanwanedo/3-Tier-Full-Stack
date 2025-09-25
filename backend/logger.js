const pino = require("pino");

const level = process.env.LOG_LEVEL || "info";
const lokiUrl = process.env.LOKI_URL;
const lokiBearer = process.env.LOKI_BEARER;

if (lokiUrl && lokiBearer) {
  const labels = Object.fromEntries(
    (process.env.LOKI_LABELS || "service=backend,env=prod")
      .split(",")
      .map(kv => kv.split("=").map(s => s.trim()))
      .filter(([k, v]) => k && v)
  );

  const transport = pino.transport({
    target: "pino-loki",
    options: {
      batching: true,
      interval: 2000,
      host: lokiUrl,
      headers: { Authorization: `Bearer ${lokiBearer}` },
      labels,
    },
  });

  module.exports = pino({ level }, transport);
} else {
  const pretty =
    process.env.NODE_ENV !== "production"
      ? pino.transport({ target: "pino-pretty", options: { colorize: true } })
      : undefined;
  module.exports = pino({ level }, pretty);
}
