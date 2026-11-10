import { describe, expect, it } from "vitest"

import app from "@/api"
import { putPublicObject } from "@/lib/s3"
import { createUser } from "@/tests/factories/auth"

describe("POST /api/user/image", () => {
  function upload(headers: Headers, file?: File) {
    const form = new FormData()
    if (file) form.set("file", file)
    return app.request("/api/user/image", {
      method: "POST",
      headers,
      body: form,
    })
  }

  it("stores the avatar under the user's id", async () => {
    const user = await createUser()

    const res = await upload(
      user.headers,
      new File(["png"], "me.png", { type: "image/png" })
    )

    expect(res.status).toBe(200)
    expect((await res.json()).url).toMatch(
      new RegExp(`^https://cdn\\.example\\.com/avatars/${user.id}\\?v=\\d+$`)
    )
    expect(putPublicObject).toHaveBeenCalledWith(
      `avatars/${user.id}`,
      expect.any(Buffer),
      "image/png"
    )
  })

  it.each([
    ["no file", undefined],
    [
      "a non-image file",
      new File(["<svg/>"], "x.svg", { type: "image/svg+xml" }),
    ],
    [
      "a file over 2 MB",
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", {
        type: "image/png",
      }),
    ],
  ])("rejects %s", async (_, file) => {
    const user = await createUser()
    expect((await upload(user.headers, file)).status).toBe(400)
    expect(putPublicObject).not.toHaveBeenCalled()
  })

  it("requires a session", async () => {
    expect((await upload(new Headers())).status).toBe(401)
  })
})
