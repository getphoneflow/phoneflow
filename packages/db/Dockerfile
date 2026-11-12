FROM node:26-alpine
WORKDIR /app

RUN npm install -g pnpm@12

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/package.json ./packages/db/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --frozen-lockfile --filter @workspace/db

COPY packages/db ./packages/db
COPY packages/shared ./packages/shared

WORKDIR /app/packages/db
CMD ["pnpm", "migrate"]
