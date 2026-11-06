import type { ReapStaleCallsResponse } from "@workspace/shared/api/calls/types"
import { api } from "@/lib/api"

export function reapStaleCalls() {
  return api.post<ReapStaleCallsResponse, never>("/calls/reap-stale", {})
}
