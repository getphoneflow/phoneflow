import type { TriggerBatchCallResponse } from "@workspace/shared/api/batch-calls/types"
import type { ProcessBatchCallPayload } from "@workspace/shared/jobs/batch-calls/types"
import { api } from "@/lib/api"

export async function processBatchCall(payload: ProcessBatchCallPayload) {
  await api.post<TriggerBatchCallResponse, never>(
    `/batch-calls/${payload.batchCallId}/trigger`,
    {}
  )

  return { batchCallId: payload.batchCallId }
}
