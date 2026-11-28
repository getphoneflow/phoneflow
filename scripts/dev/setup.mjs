import {
  DC,
  DEV_INFRA,
  freePort,
  getWorktreeMeta,
  REGISTRY_KEY,
  sh,
  writeEnv,
} from "./lib.mjs"

function allocateRedisDb(slug) {
  const existing = Number(
    sh(`${DC} exec -T redis redis-cli HGET ${REGISTRY_KEY} ${slug}`)
  )
  if (existing > 0) return existing

  const used = new Set(
    sh(`${DC} exec -T redis redis-cli HVALS ${REGISTRY_KEY}`)
      .split("\n")
      .map(Number)
  )
  for (let db = 1; db < 128; db += 1) {
    if (!used.has(db)) {
      sh(`${DC} exec -T redis redis-cli HSET ${REGISTRY_KEY} ${slug} ${db}`)
      return db
    }
  }
  throw new Error("No free Redis DBs (1-127). Run `pnpm dev:teardown <slug>`.")
}

const meta = getWorktreeMeta()

console.log("==> Installing dependencies...")
sh("npm_config_confirm_modules_purge=false pnpm install --prefer-offline", {
  stdio: "inherit",
})

console.log("==> Starting shared dev infra...")
sh(`${DC} up -d --wait --no-recreate`, { stdio: "inherit" })

const redisDb = allocateRedisDb(meta.slug)
const apiPort = await freePort()
const appPort = await freePort()

const apiUrl = `http://localhost:${apiPort}`
const appUrl = `http://localhost:${appPort}`
const dbUrl = `postgres://${DEV_INFRA.postgresUser}:${DEV_INFRA.postgresPassword}@localhost:${DEV_INFRA.postgresPort}/${meta.dbName}`
const redisUrl = `redis://localhost:${DEV_INFRA.redisPort}/${redisDb}`
const s3Endpoint = `http://localhost:${DEV_INFRA.s3Port}`
const publicS3Url = `${s3Endpoint}/${meta.publicBucket}`
const qdrantUrl = `http://localhost:${DEV_INFRA.qdrantPort}`

writeEnv("packages/db/.env", { DATABASE_URL: dbUrl })

writeEnv(
  "apps/api/.env",
  {
    PORT: apiPort,
    FRONTEND_URL: appUrl,
    API_URL: apiUrl,
    DATABASE_URL: dbUrl,
    REDIS_URL: redisUrl,
    IS_CLOUD: "true",
    BETTER_AUTH_SECRET: DEV_INFRA.betterAuthSecret,
    API_TOKEN: DEV_INFRA.apiToken,
    TURNSTILE_SECRET_KEY: DEV_INFRA.turnstileSecretKey,
    PRIVATE_S3_ACCESS_KEY: DEV_INFRA.s3AccessKey,
    PRIVATE_S3_SECRET_KEY: DEV_INFRA.s3SecretKey,
    PRIVATE_S3_BUCKET: meta.privateBucket,
    PRIVATE_S3_REGION: "auto",
    PRIVATE_S3_ENDPOINT: s3Endpoint,
    PUBLIC_S3_ACCESS_KEY: DEV_INFRA.s3AccessKey,
    PUBLIC_S3_SECRET_KEY: DEV_INFRA.s3SecretKey,
    PUBLIC_S3_BUCKET: meta.publicBucket,
    PUBLIC_S3_REGION: "auto",
    PUBLIC_S3_ENDPOINT: s3Endpoint,
    PUBLIC_S3_URL: publicS3Url,
    LIVEKIT_AGENT_NAME: meta.agentName,
  },
  { merge: true }
)

writeEnv("apps/app/.env", {
  VITE_PORT: appPort,
  VITE_FRONTEND_URL: appUrl,
  VITE_API_URL: apiUrl,
  VITE_PUBLIC_S3_URL: publicS3Url,
  VITE_LIVEKIT_AGENT_NAME: meta.agentName,
  VITE_IS_CLOUD: "true",
  VITE_TURNSTILE_SITE_KEY: DEV_INFRA.turnstileSiteKey,
})

writeEnv(
  "apps/worker/.env",
  {
    API_URL: apiUrl,
    API_TOKEN: DEV_INFRA.apiToken,
    REDIS_URL: redisUrl,
    EMAIL_HOST: "localhost",
    EMAIL_PORT: DEV_INFRA.mailpitSmtpPort,
    EMAIL_SECURE: "false",
    EMAIL_USER: DEV_INFRA.emailUser,
    EMAIL_PASSWORD: DEV_INFRA.emailPassword,
    EMAIL_FROM: DEV_INFRA.emailFrom,
    QDRANT_URL: qdrantUrl,
    QDRANT_API_KEY: DEV_INFRA.qdrantApiKey,
    QDRANT_KNOWLEDGE_BASE_COLLECTION: meta.qdrantCollection,
  },
  { merge: true }
)

writeEnv(
  "apps/voice-agent/.env",
  {
    API_URL: apiUrl,
    API_TOKEN: DEV_INFRA.apiToken,
    LIVEKIT_AGENT_NAME: meta.agentName,
    QDRANT_URL: qdrantUrl,
    QDRANT_API_KEY: DEV_INFRA.qdrantApiKey,
    QDRANT_KNOWLEDGE_BASE_COLLECTION: meta.qdrantCollection,
  },
  { merge: true }
)

const dbExists = Number(
  sh(
    `${DC} exec -T postgres psql -U ${DEV_INFRA.postgresUser} -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${meta.dbName}'"`
  )
)
if (dbExists !== 1) {
  sh(
    `${DC} exec -T postgres psql -U ${DEV_INFRA.postgresUser} -d postgres -c 'CREATE DATABASE "${meta.dbName}"'`
  )
}

sh(
  `${DC} exec -T seaweedfs sh -c 'printf "s3.bucket.create -name ${meta.privateBucket}\\ns3.bucket.create -name ${meta.publicBucket}\\n" | weed shell >/dev/null 2>&1 || true'`
)

console.log("==> Migrating and seeding database...")
sh("pnpm --filter @workspace/db migrate")
sh("pnpm --filter api seed-dev")

console.log("\nCredentials: dev@example.com / devpassword123")

console.log("\nPhoneflow ready!")
console.log(`  App:       ${appUrl}`)
console.log(`  API:       ${apiUrl}`)
console.log(`  Mailpit:   http://localhost:${DEV_INFRA.mailpitUiPort}`)
console.log(`  Postgres:  ${meta.dbName}`)
console.log(`  Redis DB:  ${redisDb}`)
console.log(`  S3:        ${meta.privateBucket}, ${meta.publicBucket}`)
console.log(`  Qdrant:    ${meta.qdrantCollection}`)
console.log(`  LiveKit:   ${meta.agentName}`)
