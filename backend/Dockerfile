# backend/Dockerfile
# ---- build & run (simple, single stage) ----
FROM node:18-slim

# Create non-root user
RUN useradd -m -u 10001 appuser

WORKDIR /app

# Install deps first for better caching
COPY package*.json ./
# Use lockfile if present; fall back if not
RUN npm ci --omit=dev || npm install --omit=dev

# Copy source
COPY . .

# Ensure the app files belong to the runtime user
RUN chown -R appuser:appuser /app

# Drop privileges
USER appuser

# Runtime env
ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

# Optional: simple healthcheck (adjust path if needed)
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD node -e "require('http').get('http://127.0.0.1:3000/api/ping', r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["npm","start"]
