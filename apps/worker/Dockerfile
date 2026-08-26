FROM node:24-alpine AS base
WORKDIR /app

RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/email/package.json ./packages/email/package.json
COPY packages/shared/package.json ./packages/shared/package.json

FROM base AS build-deps
WORKDIR /app

RUN pnpm install --frozen-lockfile

FROM base AS production-deps
WORKDIR /app

RUN pnpm install --prod --frozen-lockfile

FROM build-deps AS build
WORKDIR /app

COPY apps/worker ./apps/worker
COPY packages/email ./packages/email
COPY packages/shared ./packages/shared

RUN pnpm --filter worker build

FROM node:24-alpine
WORKDIR /app

COPY --from=production-deps /app ./
COPY --from=build /app/apps/worker/dist ./

ENV NODE_ENV=production

CMD ["node", "./apps/worker/src/index.js"]
