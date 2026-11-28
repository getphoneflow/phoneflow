import { execSync } from "node:child_process"
import crypto from "node:crypto"
import fs from "node:fs"
import net from "node:net"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "../..")

export const REGISTRY_KEY = "phoneflow:worktrees"
export const DC = "docker compose -f docker-compose.dev.yaml"

export const DEV_INFRA = {
  postgresUser: "phoneflow",
  postgresPassword: "phoneflow",
  postgresPort: 5432,
  redisPort: 6379,
  mailpitSmtpPort: 1025,
  mailpitUiPort: 8025,
  emailUser: "phoneflow",
  emailPassword: "phoneflow",
  emailFrom: "noreply@example.com",
  qdrantPort: 6333,
  qdrantApiKey: "phoneflow-dev",
  s3Port: 8333,
  s3AccessKey: "phoneflow",
  s3SecretKey: "phoneflow",
  betterAuthSecret: "phoneflow-dev-secret-change-me-01",
  apiToken: "phoneflow-dev-token",
  turnstileSiteKey: "1x00000000000000000000AA",
  turnstileSecretKey: "1x0000000000000000000000000000000AA",
}

const EXEC_ENV = {
  ...process.env,
  POSTGRES_PASSWORD: DEV_INFRA.postgresPassword,
  S3_ACCESS_KEY: DEV_INFRA.s3AccessKey,
  S3_SECRET_KEY: DEV_INFRA.s3SecretKey,
  QDRANT_API_KEY: DEV_INFRA.qdrantApiKey,
  EMAIL_USER: DEV_INFRA.emailUser,
  EMAIL_PASSWORD: DEV_INFRA.emailPassword,
}

export function sh(cmd, opts) {
  return execSync(cmd, { cwd: ROOT, env: EXEC_ENV, encoding: "utf8", ...opts })
}

export function parseEnv(relPath) {
  const file = path.join(ROOT, relPath)
  if (!fs.existsSync(file)) return {}
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Za-z_]\w*)\s*=(.*)$/))
      .filter((m) => m?.[2].trim())
      .map(([, k, v]) => [k, v.trim()])
  )
}

export function writeEnv(relPath, entries, { merge = false } = {}) {
  const data = merge ? { ...parseEnv(relPath), ...entries } : entries
  const lines = Object.entries(data).map(([k, v]) => `${k}=${v}`)
  fs.writeFileSync(path.join(ROOT, relPath), `${lines.join("\n")}\n`)
}

export function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.once("error", reject)
    s.listen(0, () => {
      const { port } = s.address()
      s.close(() => resolve(port))
    })
  })
}

export function getWorktreeMeta(slugOverride) {
  let slug = slugOverride
  if (!slug) {
    const base = path
      .basename(ROOT)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 20)
    const hash = crypto
      .createHash("sha256")
      .update(ROOT)
      .digest("hex")
      .slice(0, 4)
    slug = `${base || "wt"}-${hash}`
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`Invalid worktree slug: ${slug}`)
  }

  const snake = slug.replaceAll("-", "_")
  return {
    slug,
    dbName: `phoneflow_${snake}`,
    privateBucket: `phoneflow-private-${slug}`,
    publicBucket: `phoneflow-public-${slug}`,
    qdrantCollection: `knowledge_base_chunks_${snake}`,
    agentName: `voice-agent-${slug}`,
  }
}
