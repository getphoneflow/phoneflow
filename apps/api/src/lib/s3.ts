import {
  GetObjectCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3"

import { env } from "@/lib/env"

type S3Config = {
  accessKey: string
  secretKey: string
  bucket: string
  region: string
  endpoint: string
}

function createClient(config: S3Config) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
  })
}

function isConfigured(config: S3Config) {
  return Boolean(
    config.accessKey && config.secretKey && config.bucket && config.endpoint
  )
}

function getObject(client: S3Client, bucket: string, key: string) {
  return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
}

function putObject(
  client: S3Client,
  bucket: string,
  key: string,
  body: PutObjectCommandInput["Body"],
  contentType?: string
) {
  return client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
}

const privateConfig: S3Config = {
  accessKey: env.PRIVATE_S3_ACCESS_KEY,
  secretKey: env.PRIVATE_S3_SECRET_KEY,
  bucket: env.PRIVATE_S3_BUCKET,
  region: env.PRIVATE_S3_REGION,
  endpoint: env.PRIVATE_S3_ENDPOINT,
}

const publicConfig: S3Config = {
  accessKey: env.PUBLIC_S3_ACCESS_KEY,
  secretKey: env.PUBLIC_S3_SECRET_KEY,
  bucket: env.PUBLIC_S3_BUCKET,
  region: env.PUBLIC_S3_REGION,
  endpoint: env.PUBLIC_S3_ENDPOINT,
}

const privateClient = createClient(privateConfig)
const publicClient = createClient(publicConfig)

export function privateS3Configured() {
  return isConfigured(privateConfig)
}

export function publicS3Configured() {
  return isConfigured(publicConfig)
}

export function getPrivateObject(key: string) {
  return getObject(privateClient, privateConfig.bucket, key)
}

export function getPublicObject(key: string) {
  return getObject(publicClient, publicConfig.bucket, key)
}

export function putPrivateObject(
  key: string,
  body: PutObjectCommandInput["Body"],
  contentType?: string
) {
  return putObject(privateClient, privateConfig.bucket, key, body, contentType)
}

export function putPublicObject(
  key: string,
  body: PutObjectCommandInput["Body"],
  contentType?: string
) {
  return putObject(publicClient, publicConfig.bucket, key, body, contentType)
}

export { privateConfig, publicConfig }
