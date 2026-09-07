import { Hono } from "hono"

import { createTokenRequestSchema } from "@workspace/shared/api/token/schemas"
import type { CreateTokenResponse } from "@workspace/shared/api/token/types"
import { requireOrganization } from "@/lib/auth/organization"
import { createAccessToken } from "@/lib/livekit"
import { validator } from "@/lib/validator"

export const tokenRoutes = new Hono()

tokenRoutes.post(
  "/",
  requireOrganization,
  validator("json", createTokenRequestSchema),
  async (c) => {
    const body = c.req.valid("json")

    const sessionId = crypto.randomUUID()
    const room = body.room_name ?? `session-${sessionId}`

    const token = await createAccessToken({
      identity: body.participant_identity ?? `user-${sessionId}`,
      name: body.participant_name ?? "user",
      metadata: body.participant_metadata ?? "",
      attributes: body.participant_attributes ?? {},
      grant: { room, roomJoin: true },
      roomConfig: body.room_config,
    })

    return c.json(token satisfies CreateTokenResponse, 201)
  }
)
