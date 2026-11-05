import type { TickBatchCallPayload } from "./types"

export const BATCH_CALL_TICK_JOB = "tick-batch-call"

// The job id is the batch plus the wall-clock boundary it runs at, so a resume
// racing a tick that is about to reschedule itself cannot start a second chain:
// both land on the same boundary and BullMQ keeps one job.
export function batchCallTickJob(
  batchCallId: string,
  intervalMs: number,
  now: number
) {
  const runAt = (Math.floor(now / intervalMs) + 1) * intervalMs

  return {
    name: BATCH_CALL_TICK_JOB,
    data: { batchCallId, runAt } satisfies TickBatchCallPayload,
    opts: {
      jobId: `tick-${batchCallId}-${runAt}`,
      delay: runAt - now,
      removeOnComplete: true,
      removeOnFail: true,
    },
  }
}
