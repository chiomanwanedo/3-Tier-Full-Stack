/* frontend/src/services/api.js
 *
 * Centralized API client for the YelpCamp frontend (Vite + JS).
 * - Defaults to relative "/api" so Nginx proxies in production.
 * - Honors VITE_API_URL if provided at build time (e.g., docker build args).
 * - Includes JSON helper, timeout, and simple error handling.
 */

const API_BASE =
  (import.meta?.env?.VITE_API_URL?.replace(/\/+$/, "")) || "/api";

const DEFAULTS = {
  credentials: "include", // keep session cookie for auth routes
  headers: { "Content-Type": "application/json" },
};

function withTimeout(ms) {
  if (!ms) return undefined;
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function fetchJson(path, opts = {}, timeoutMs = 15000) {
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const signal = withTimeout(timeoutMs);

  const res = await fetch(url, {
    ...DEFAULTS,
    ...opts,
    signal,
    headers: { ...DEFAULTS.headers, ...(opts.headers || {}) },
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message =
      (data && data.message) || `Request failed (${res.status} ${res.statusText})`;
    const err = new Error(message);
    err.status = res.status;
    err.details = data || text;
    throw err;
  }
  return data ?? null;
}

/* =========================
 * Public API surface
 * =========================
 */
export const api = {
  // Health
  ping: () => fetchJson("/ping"),

  // Campgrounds (backend returns an array)
  listCampgrounds: () => fetchJson("/campgrounds"),
  getCampground: (id) => fetchJson(`/campgrounds/${encodeURIComponent(id)}`),
  createCampground: (payload) =>
    fetchJson("/campgrounds", { method: "POST", body: JSON.stringify(payload) }),
  updateCampground: (id, payload) =>
    fetchJson(`/campgrounds/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteCampground: (id) =>
    fetchJson(`/campgrounds/${encodeURIComponent(id)}`, { method: "DELETE" }),

  // Auth (adjust to your backend if paths differ)
  me: () => fetchJson("/users/me"),
  login: (username, password) =>
    fetchJson("/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  register: (username, password, email) =>
    fetchJson("/register", {
      method: "POST",
      body: JSON.stringify({ username, password, email }),
    }),
  logout: () =>
    fetchJson("/logout", {
      method: "POST",
      body: JSON.stringify({}),
    }),
};

/* =========
 * Compat shim so legacy code like `api.campgrounds.list()` works.
 * (Under the hood it just calls listCampgrounds and returns the array.)
 * ========= */
api.campgrounds = {
  list: api.listCampgrounds,
};

/* =========
 * Handy utilities
 * ========= */
export const getApiBase = () => API_BASE;

/** Small helper to wrap async API calls with [data, error] */
export function wrap(fn) {
  return async (...args) => {
    try {
      const data = await fn(...args);
      return [data, null];
    } catch (e) {
      return [null, e];
    }
  };
}

/* Default export for convenience */
export default api;
