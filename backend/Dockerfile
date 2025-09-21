# ---- build & run (simple, single stage) ----
FROM node:18-slim

# Install CA bundle so TLS (MongoDB Atlas) works
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Create non-root app user
RUN useradd -m -u 10001 appuser

WORKDIR /app

# Install dependencies (prefer lockfile)
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy app code
COPY . .

# Permissions and drop privileges
RUN chown -R appuser:appuser /app
USER appuser

# Runtime env
ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000
CMD ["npm", "start"]
