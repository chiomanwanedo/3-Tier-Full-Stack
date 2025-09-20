# backend/Dockerfile
FROM node:18-alpine

# If you have native deps (bcrypt, sharp, etc.), switch to node:18 and add build tools:
# RUN apk add --no-cache python3 make g++

# Non-root user (optional but good)
RUN adduser -D -u 10001 appuser

WORKDIR /app

# 1) Copy ONLY dependency manifests first so Docker can cache npm ci layers
COPY package*.json ./

# 2) Install deps (use lockfile if present)
RUN npm ci --omit=dev || npm install --omit=dev

# 3) Copy the rest of your app
COPY . .

ENV NODE_ENV=production
USER appuser
EXPOSE 3000

CMD ["node", "app.js"]
