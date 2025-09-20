# ---- build & run (simple, single stage) ----
FROM node:18-slim

# Create non-root app user early (safer)
RUN useradd -m -u 10001 appuser

WORKDIR /app

# Install deps with a lockfile if present; fall back if not
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy the app
COPY . .

# Drop privileges
USER appuser

# App runtime env
ENV HOST=0.0.0.0 \
    NODE_ENV=production \
    PORT=3000

EXPOSE 3000
CMD ["npm","start"]

