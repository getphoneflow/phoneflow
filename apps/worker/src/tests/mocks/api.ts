import { vi } from "vitest"

import type * as real from "@/lib/api"

export const api = {
  get: vi.fn<typeof real.api.get>(),
  post: vi.fn<typeof real.api.post>(),
}
