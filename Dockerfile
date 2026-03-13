FROM node:22-alpine AS builder
WORKDIR /app

# Submodules must be initialized before Docker build.
# CI handles this via actions/checkout with submodules: recursive.
# For local builds: git submodule update --init --recursive

COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm build --filter=shell

FROM nginx:alpine
COPY --from=builder /app/apps/shell/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# In production: mount ConfigMap to /usr/share/nginx/html/config.json
# The default config.json (dev defaults) is included from the build stage.
EXPOSE 80
