import { vi } from "vitest"

import type * as s3 from "@/lib/s3"

// Config helpers only read env, so they stay real
const actual = await vi.importActual<typeof s3>("@/lib/s3")

export const {
  privateConfig,
  publicConfig,
  privateS3Configured,
  publicS3Configured,
} = actual

export const getPrivateObject = vi.fn<typeof s3.getPrivateObject>()
export const getPublicObject = vi.fn<typeof s3.getPublicObject>()
export const putPrivateObject = vi.fn<typeof s3.putPrivateObject>(
  async () => ({}) as never
)
export const putPublicObject = vi.fn<typeof s3.putPublicObject>(
  async () => ({}) as never
)
export const deletePrivateObject = vi.fn<typeof s3.deletePrivateObject>(
  async () => ({}) as never
)
