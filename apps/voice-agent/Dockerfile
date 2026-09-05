FROM node:24-slim AS base
WORKDIR /app
RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/voice-agent/package.json ./apps/voice-agent/package.json
COPY packages/shared/package.json ./packages/shared/package.json

FROM base AS deps

RUN pnpm install --frozen-lockfile --filter voice-agent...

FROM deps AS build

COPY apps/voice-agent ./apps/voice-agent
COPY packages/shared ./packages/shared

RUN pnpm --filter voice-agent build

FROM node:24-slim
WORKDIR /app

COPY --from=deps /app ./
COPY --from=build /app/apps/voice-agent/dist ./apps/voice-agent/dist

ENV NODE_ENV=production
ENV LOG_LEVEL=error

CMD ["node", "./apps/voice-agent/dist/apps/voice-agent/src/main.js", "start"]
