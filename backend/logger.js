// backend/lib/loki.js
const pino = require("pino");

const level = process.env.LOG_LEVEL || "info";
const lokiUrl   = process.env.LOKI_URL || "https://logs-prod-035.grafana.net"; // base URL/host
const lokiUser  = process.env.LOKI_USER;        // e.g., 1345066
const lokiToken = process.env.LOKI_TOKEN;       // Grafana Cloud Logs:write token
const lokiTenant = process.env.LOKI_TENANT || lokiUser; // usually same as instance ID

if (lokiUrl && lokiUser && lokiToken) {
  const labels = Object.fromEntries(
    (process.env.LOKI_LABELS || "service=backend,env=prod")
      .split(",")
      .map(kv => kv.split("=").map(s => s.trim()))
      .filter(([k, v]) => k && v)
  );

  const transport = pino.transport({
    target: "pino-loki",
    options: {
      host: lokiUrl,                 // e.g. https://logs-prod-035.grafana.net
      endpoint: "/loki/api/v1/push", // explicit, matches Grafana Cloud
      batching: true,
      interval: 2000,
      basicAuth: {
        username: lokiUser,          // 1345066
        password: lokiToken,         // Logs:write token
      },
      headers: {
        "X-Scope-OrgID": lokiTenant, // usually 1345066
      },
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
