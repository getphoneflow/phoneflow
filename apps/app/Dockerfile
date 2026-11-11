FROM node:26-alpine AS build
WORKDIR /app

RUN npm install -g pnpm@12

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/app/package.json ./apps/app/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/i18n/package.json ./packages/i18n/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY apps/app ./apps/app
COPY packages/ui ./packages/ui
COPY packages/i18n ./packages/i18n
COPY packages/shared ./packages/shared

ARG VITE_FRONTEND_URL
ARG VITE_API_URL
ARG VITE_PUBLIC_S3_URL
ARG VITE_TURNSTILE_SITE_KEY
ARG VITE_POSTHOG_PROJECT_TOKEN
ARG VITE_POSTHOG_HOST

RUN pnpm --filter app build

FROM caddy:2.11-alpine

COPY --from=build /app/apps/app/dist /srv
COPY apps/app/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
