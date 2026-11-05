import type { BatchCallTickResponse } from "@workspace/shared/api/batch-calls/types"
import { batchCallTickJob } from "@workspace/shared/jobs/batch-calls/tick"
import type { TickBatchCallPayload } from "@workspace/shared/jobs/batch-calls/types"
import { ApiError, api } from "@/lib/api"
import { batchCallsQueue } from "@/lib/queues"

const RETRY_DELAY_MS = 60_000

async function requestTick(batchCallId: string) {
  try {
    const { nextDelayMs } = await api.post<BatchCallTickResponse, never>(
      `/batch-calls/${batchCallId}/tick`,
      {}
    )
    return nextDelayMs
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }

    // The chain is the only thing keeping a running batch alive, so an API outage
    // must not end it: nothing would ever dial the remaining recipients.
    console.error(`[batch-calls] tick failed for ${batchCallId}`, error)
    return RETRY_DELAY_MS
  }
}

export async function tickBatchCallJob(payload: TickBatchCallPayload) {
  const nextDelayMs = await requestTick(payload.batchCallId)

  if (nextDelayMs !== null) {
    // A worker clock behind the one that promoted this job could otherwise compute
    // this job's own boundary, and BullMQ would drop the add as a duplicate.
    const job = batchCallTickJob(
      payload.batchCallId,
      nextDelayMs,
      Math.max(Date.now(), payload.runAt)
    )
    await batchCallsQueue.add(job.name, job.data, job.opts)
  }

  return { batchCallId: payload.batchCallId, nextDelayMs }
}
