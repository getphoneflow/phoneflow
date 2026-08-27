import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3"

import { env } from "@/lib/env"

const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
})

export function s3Configured() {
  return Boolean(
    env.S3_ACCESS_KEY && env.S3_SECRET_KEY && env.S3_BUCKET && env.S3_ENDPOINT
  )
}

export function getObject(key: string) {
  return s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }))
}
