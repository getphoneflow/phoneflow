FROM node:24-alpine AS base
WORKDIR /app

RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/shared/package.json ./packages/shared/package.json

FROM base AS build-deps

RUN pnpm install --frozen-lockfile --filter api...

FROM base AS prod-deps

RUN pnpm install --prod --frozen-lockfile --filter api...

FROM build-deps AS build

COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared

RUN pnpm --filter api build

FROM node:24-alpine
WORKDIR /app

COPY --from=prod-deps /app ./
COPY --from=build /app/apps/api/dist ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE $PORT
CMD ["node", "./apps/api/src/index.js"]
