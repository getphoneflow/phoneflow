import { vi } from "vitest"

vi.mock(
  "@workspace/db/client",
  () => import("@workspace/db/tests/mocks/client")
)
vi.mock("@/lib/queues", () => import("./mocks/queues"))
vi.mock("@/lib/livekit", () => import("./mocks/livekit"))
vi.mock("@/lib/s3", () => import("./mocks/s3"))
vi.mock("@/lib/stripe", () => import("./mocks/stripe"))
