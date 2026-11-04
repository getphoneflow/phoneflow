import { Hono } from "hono"

import type { UploadUserImageResponse } from "@workspace/shared/api/user/types"
import { requireSession } from "@/lib/auth/session"
import { env } from "@/lib/env"
import { t } from "@/lib/i18n"
import { publicS3Configured, putPublicObject } from "@/lib/s3"

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

export const userRoutes = new Hono()

userRoutes.post("/image", requireSession, async (c) => {
  const locale = c.get("locale")
  if (!publicS3Configured() || !env.PUBLIC_S3_URL) {
    return c.json({ error: t(locale, "user.storage_not_configured") }, 503)
  }

  const userId = c.get("userId")
  const body = await c.req.parseBody()
  const file = body["file"]

  if (!(file instanceof File)) {
    return c.json({ error: t(locale, "user.image_required") }, 400)
  }

  if (!IMAGE_TYPES.has(file.type)) {
    return c.json({ error: t(locale, "user.image_type_invalid") }, 400)
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return c.json({ error: t(locale, "user.image_too_large") }, 400)
  }

  try {
    const key = `avatars/${userId}`
    await putPublicObject(key, Buffer.from(await file.arrayBuffer()), file.type)

    return c.json({
      url: `${env.PUBLIC_S3_URL}/${key}?v=${Date.now()}`,
    } satisfies UploadUserImageResponse)
  } catch {
    return c.json({ error: t(locale, "user.upload_image_failed") }, 500)
  }
})
