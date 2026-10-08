FROM node:24-alpine AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/app/package.json ./apps/app/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY apps/app ./apps/app
COPY packages/ui ./packages/ui
COPY packages/shared ./packages/shared

ARG VITE_FRONTEND_URL
ARG VITE_API_URL
ARG VITE_PUBLIC_S3_URL
ARG VITE_TURNSTILE_SITE_KEY
ARG VITE_POSTHOG_PROJECT_TOKEN
ARG VITE_POSTHOG_HOST

RUN pnpm --filter app build

FROM nginx:alpine
WORKDIR /app

COPY --from=build /app/apps/app/dist /usr/share/nginx/html
COPY apps/app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
