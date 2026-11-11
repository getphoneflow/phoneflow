FROM node:26-alpine AS base
WORKDIR /app

RUN npm install -g pnpm@12

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/email/package.json ./packages/email/package.json
COPY packages/i18n/package.json ./packages/i18n/package.json
COPY packages/shared/package.json ./packages/shared/package.json

FROM base AS build-deps

RUN pnpm install --frozen-lockfile

FROM base AS prod-deps

RUN pnpm install --prod --frozen-lockfile --filter worker --filter @workspace/email

FROM build-deps AS build

COPY apps/worker ./apps/worker
COPY packages/email ./packages/email
COPY packages/i18n ./packages/i18n
COPY packages/shared ./packages/shared

RUN pnpm --filter worker build

FROM node:26-alpine
WORKDIR /app

COPY --from=prod-deps /app ./
COPY --from=build /app/apps/worker/dist ./

ENV NODE_ENV=production

CMD ["node", "./apps/worker/src/index.js"]
