# Digital Futures web app: the React build served by nginx, which also forwards /api to the backend.
# Build:  docker build -t df-frontend .
# Run:    docker run -p 8080:8080 -e BACKEND_UPSTREAM=backend:5000 df-frontend

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The built app calls the API on its own address (/api), so no API URL is baked in.
RUN npm run build

# nginx running as an unprivileged user on port 8080.
FROM nginxinc/nginx-unprivileged:1.27-alpine
# Templates in /etc/nginx/templates are filled from environment variables when the container starts.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Where nginx sends /api requests: host:port of the backend container.
ENV BACKEND_UPSTREAM=backend:5000 \
    CLIENT_MAX_BODY_SIZE=25m

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
