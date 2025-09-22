# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# Install deps using the lockfile
COPY package*.json ./
RUN npm ci

# Copy source and build (Vite outputs to dist/)
COPY . .
# Optional: override at build time if you ever want an absolute API
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# --- Runtime stage (Nginx) ---
FROM nginx:alpine

# ✅ Allow HTTPS proxying to Render (fixes 502 due to missing CA bundle)
RUN apk add --no-cache ca-certificates && update-ca-certificates

# Nginx config + static assets
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/

EXPOSE 80
