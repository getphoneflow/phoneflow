FROM node:26-slim AS base
WORKDIR /app
RUN npm install -g pnpm@12

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/voice-agent/package.json ./apps/voice-agent/package.json
COPY packages/shared/package.json ./packages/shared/package.json

FROM base AS build-deps

RUN pnpm install --frozen-lockfile

FROM base AS prod-deps

RUN pnpm install --prod --frozen-lockfile --filter voice-agent

FROM build-deps AS build

COPY apps/voice-agent ./apps/voice-agent
COPY packages/shared ./packages/shared

RUN pnpm --filter voice-agent build

FROM node:26-slim
WORKDIR /app

COPY --from=prod-deps /app ./
COPY --from=build /app/apps/voice-agent/dist ./apps/voice-agent/dist
COPY apps/voice-agent/background ./background

ENV NODE_ENV=production
ENV LOG_LEVEL=error

CMD ["node", "./apps/voice-agent/dist/apps/voice-agent/src/main.js", "start"]
