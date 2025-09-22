# frontend/Dockerfile

# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Optional: allow overriding API at build time (not needed for relative /api)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build   # Vite -> dist/ ; if CRA, change to build/

# --- Runtime stage ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/

EXPOSE 80
