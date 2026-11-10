import { describe, expect, it } from "vitest"

import { createOrganization } from "@/tests/factories/auth"

function decodeJwt(token: string) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString())
}

describe("POST /api/token (web test calls)", () => {
  it("issues a LiveKit token for the requested room", async () => {
    const org = await createOrganization()
    const member = await org.as("member")

    const res = await member.api.post("/api/token", {
      body: {
        room_name: "test-room",
        participant_name: "Ada",
        participant_attributes: { agentId: "agent-1" },
      },
    })

    expect(res.status).toBe(201)
    const { participant_token, server_url } = res.body
    expect(server_url).toBe("wss://livekit.example.com")
    const claims = decodeJwt(participant_token)
    expect(claims).toMatchObject({
      name: "Ada",
      attributes: { agentId: "agent-1" },
      video: { room: "test-room", roomJoin: true },
    })
  })

  it("generates a unique room when none is given", async () => {
    const member = await (await createOrganization()).as("member")

    const first = decodeJwt(
      (await member.api.post("/api/token", { body: {} })).body.participant_token
    )
    const second = decodeJwt(
      (await member.api.post("/api/token", { body: {} })).body.participant_token
    )

    expect(first.video.room).toMatch(/^session-/)
    expect(first.video.room).not.toBe(second.video.room)
  })
})
