# docker-compose.yml
version: "3.9"

services:
  mongo:
    image: mongo:6
    container_name: yelpcamp_mongo
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.runCommand({ ping: 1 })"]
      interval: 5s
      timeout: 3s
      retries: 20

  # Optional DB UI at http://localhost:8081
  mongo-express:
    image: mongo-express:1.0.2-20
    container_name: yelpcamp_mongo_express
    depends_on:
      mongo:
        condition: service_healthy
    environment:
      ME_CONFIG_MONGODB_SERVER: mongo
      ME_CONFIG_BASICAUTH_USERNAME: admin
      ME_CONFIG_BASICAUTH_PASSWORD: admin
    ports:
      - "8081:8081"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: yelpcamp_backend
    env_file:
      - .env.backend               # must contain DB_URL, SECRET, MAPBOX_TOKEN (if backend also uses it), CLOUDINARY_*, etc.
    environment:
      - PORT=3000
    ports:
      - "3000:3000"
    depends_on:
      mongo:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend          # this is where your Dockerfile (with the Mapbox/Vite args) lives
      dockerfile: Dockerfile       # rename if you used Dockerfile.frontend
      args:                        # <- feeds your Vite build at image-build time
        VITE_API_URL: "/api"
        VITE_MAPBOX_TOKEN: "${VITE_MAPBOX_TOKEN}"
        VITE_CLOUDINARY_CLOUD_NAME: "${VITE_CLOUDINARY_CLOUD_NAME}"
        VITE_CLOUDINARY_UPLOAD_PRESET: "${VITE_CLOUDINARY_UPLOAD_PRESET}"
    container_name: yelpcamp_frontend
    ports:
      - "8082:80"
    depends_on:
      backend:
        condition: service_started
    # no env_file needed here because we pass VITE_* via build args

volumes:
  mongo_data:
