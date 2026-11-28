import {
  DC,
  DEV_INFRA,
  getWorktreeMeta,
  parseEnv,
  REGISTRY_KEY,
  sh,
} from "./lib.mjs"

function trySh(cmd) {
  try {
    return sh(cmd, { stdio: ["ignore", "pipe", "ignore"] })
  } catch {
    return ""
  }
}

const targetSlug = process.argv.slice(2).find((a) => !a.startsWith("-"))
const meta = getWorktreeMeta(targetSlug)

const storedDb = Number(
  trySh(`${DC} exec -T redis redis-cli HGET ${REGISTRY_KEY} ${meta.slug}`)
)
const redisDb =
  storedDb > 0
    ? storedDb
    : targetSlug
      ? 0
      : Number(parseEnv("apps/api/.env").REDIS_URL?.split("/").pop()) || 0

console.log(`==> Cleaning up resources for ${meta.slug}...`)

console.log(`  dropping postgres db: ${meta.dbName}`)
trySh(
  `${DC} exec -T postgres psql -U ${DEV_INFRA.postgresUser} -d postgres -c 'DROP DATABASE IF EXISTS "${meta.dbName}" WITH (FORCE)'`
)

if (Number.isInteger(redisDb) && redisDb > 0) {
  console.log(`  flushing redis db: ${redisDb}`)
  trySh(`${DC} exec -T redis redis-cli -n ${redisDb} FLUSHDB`)
}

for (const bucket of [meta.privateBucket, meta.publicBucket]) {
  console.log(`  deleting s3 bucket: ${bucket}`)
  trySh(
    `${DC} exec -T seaweedfs sh -c 'echo "fs.rm -r -f /buckets/${bucket}" | weed shell'`
  )
}

console.log(`  deleting qdrant collection: ${meta.qdrantCollection}`)
try {
  await fetch(
    `http://localhost:${DEV_INFRA.qdrantPort}/collections/${encodeURIComponent(meta.qdrantCollection)}`,
    {
      method: "DELETE",
      headers: { "api-key": DEV_INFRA.qdrantApiKey },
      signal: AbortSignal.timeout(3000),
    }
  )
} catch {
  // qdrant not running or collection never created
}

trySh(`${DC} exec -T redis redis-cli HDEL ${REGISTRY_KEY} ${meta.slug}`)

console.log("Worktree torn down (shared infra left running).")
