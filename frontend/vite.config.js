// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config for both dev (HMR) and prod (Docker/Nginx).
// - Use relative API URLs in code (e.g. fetch('/api/...')).
// - In dev (running on your host), the proxy forwards /api -> http://localhost:8080.
// - In prod (Docker), Nginx inside the frontend image proxies /api -> backend:3000 (see nginx.conf).
export default defineConfig({
  plugins: [react()],

  // Keep the app served at "/" (default). Do NOT set base:'/app/' unless nginx serves under /app/.
  // base: '/',

  // Dev-only proxy so you can run `npm run dev` locally if needed.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // backend mapped to host:8080
        changeOrigin: true,
      },
    },
  },

  // Optional: settings for `vite preview` (local preview of the production build)
  preview: {
    port: 5173,
    strictPort: true,
  },
})
