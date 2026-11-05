import { and, count, eq, inArray, lt, notExists, or, sql } from "drizzle-orm"

import { db } from "@workspace/db/client"
import { agentsTable, agentVersionsTable } from "@workspace/db/schema/agents"
import {
  batchCallRecipientsTable,
  batchCallsTable,
} from "@workspace/db/schema/batch-calls"
import { isWithinBatchSchedule } from "@workspace/shared/api/batch-calls/schedule"
import type {
  BatchCallRecipientStatus,
  BatchCallStatus,
  BatchCallTickResponse,
} from "@workspace/shared/api/batch-calls/types"
import { CALL_RING_DURATION_MS } from "@workspace/shared/constants/calls"
import { batchCallTickJob } from "@workspace/shared/jobs/batch-calls/tick"
import { organizationHasCredits } from "@/lib/credits"
import { env } from "@/lib/env"
import { placeOutboundCall } from "@/lib/livekit"
import { batchCallsQueue } from "@/lib/queues"

const TICK_INTERVAL_MS = 10_000
// Slow enough to be cheap for a batch waiting overnight, fast enough to start
// within a minute of its window opening.
const IDLE_POLL_MS = 60_000

// The agent gives up on an unanswered call after the ring time and reports it,
// so a recipient still dialing well past that means the agent never took the job.
const DIALING_TIMEOUT_MS = 5 * 60_000
// An answered call ends itself at the agent's max duration, which has no upper
// bound in the agent config, so a fixed limit would either cut long calls or
// hold slots for hours. The grace covers the time to report the outcome.
const IN_PROGRESS_GRACE_MS = 5 * 60_000
const FALLBACK_MAX_DURATION_SEC = 3600

const MAX_ERROR_LENGTH = 500

export const RECIPIENT_ERRORS = {
  callTimedOut: "call_timed_out",
  callStartFailed: "call_start_failed",
  insufficientCredits: "insufficient_credits",
  agentNotFound: "agent_not_found",
  unexpectedCallStatus: "unexpected_call_status",
  placementFailed: "placement_failed",
} as const

const ACTIVE_STATUSES: BatchCallRecipientStatus[] = ["dialing", "in_progress"]
const UNFINISHED_STATUSES: BatchCallRecipientStatus[] = [
  "pending",
  ...ACTIVE_STATUSES,
]

export async function enqueueBatchCallTick(
  batchCallId: string,
  intervalMs = TICK_INTERVAL_MS
) {
  const job = batchCallTickJob(batchCallId, intervalMs, Date.now())
  await batchCallsQueue.add(job.name, job.data, job.opts)
}

export function recipientOutcomeForCallStatus(callStatus: string): {
  status: BatchCallRecipientStatus
  error: string | null
} {
  switch (callStatus) {
    case "completed":
      return { status: "completed", error: null }
    case "no_answer":
    case "voicemail":
      return { status: "no_answer", error: null }
    default:
      return {
        status: "failed",
        error: RECIPIENT_ERRORS.unexpectedCallStatus,
      }
  }
}

type RecipientUpdate = {
  batchCallId: string
  recipientId?: string | null
  callId?: string
  status: BatchCallRecipientStatus
  error?: string | null
}

// A timed-out recipient may still report: the timeout is a guess and a late real
// outcome is better information. Every other terminal status is final.
export async function updateBatchCallRecipient(update: RecipientUpdate) {
  const target = update.recipientId
    ? eq(batchCallRecipientsTable.id, update.recipientId)
    : update.callId
      ? eq(batchCallRecipientsTable.callId, update.callId)
      : null

  if (!target) {
    return
  }

  await db
    .update(batchCallRecipientsTable)
    .set({
      status: update.status,
      error: update.error ?? null,
      updatedAt: new Date(),
      ...(update.callId ? { callId: update.callId } : {}),
    })
    .where(
      and(
        target,
        eq(batchCallRecipientsTable.batchCallId, update.batchCallId),
        or(
          inArray(batchCallRecipientsTable.status, ACTIVE_STATUSES),
          and(
            eq(batchCallRecipientsTable.status, "failed"),
            eq(batchCallRecipientsTable.error, RECIPIENT_ERRORS.callTimedOut)
          )
        )
      )
    )
}

async function resolveMaxDurationSec(
  agentId: string,
  agentVersionId: string | null
) {
  const table = agentVersionId ? agentVersionsTable : agentsTable
  const [row] = await db
    .select({
      maxDurationSec: sql<
        number | null
      >`(${table.config}->'call'->>'maxDurationSec')::int`,
    })
    .from(table)
    .where(eq(table.id, agentVersionId ?? agentId))

  return row?.maxDurationSec ?? FALLBACK_MAX_DURATION_SEC
}

async function releaseStuckRecipients(batchCall: {
  id: string
  agentId: string
  agentVersionId: string | null
}) {
  const now = Date.now()
  const maxDurationSec = await resolveMaxDurationSec(
    batchCall.agentId,
    batchCall.agentVersionId
  )

  await db
    .update(batchCallRecipientsTable)
    .set({
      status: "failed",
      error: RECIPIENT_ERRORS.callTimedOut,
      updatedAt: new Date(now),
    })
    .where(
      and(
        eq(batchCallRecipientsTable.batchCallId, batchCall.id),
        or(
          and(
            eq(batchCallRecipientsTable.status, "dialing"),
            lt(
              batchCallRecipientsTable.dialedAt,
              new Date(now - DIALING_TIMEOUT_MS)
            )
          ),
          and(
            eq(batchCallRecipientsTable.status, "in_progress"),
            lt(
              batchCallRecipientsTable.dialedAt,
              new Date(
                now -
                  CALL_RING_DURATION_MS -
                  maxDurationSec * 1000 -
                  IN_PROGRESS_GRACE_MS
              )
            )
          )
        )
      )
    )
}

async function completeIfFinished(batchCallId: string) {
  const completed = await db
    .update(batchCallsTable)
    .set({ status: "completed", pauseReason: null, updatedAt: new Date() })
    .where(
      and(
        eq(batchCallsTable.id, batchCallId),
        eq(batchCallsTable.status, "running"),
        notExists(
          db
            .select({ id: batchCallRecipientsTable.id })
            .from(batchCallRecipientsTable)
            .where(
              and(
                eq(batchCallRecipientsTable.batchCallId, batchCallId),
                inArray(batchCallRecipientsTable.status, UNFINISHED_STATUSES)
              )
            )
        )
      )
    )
    .returning({ id: batchCallsTable.id })

  return completed.length > 0
}

async function pauseBatchCall(
  batchCallId: string,
  pauseReason: "insufficient_credits" | "phone_number_unavailable"
) {
  await db
    .update(batchCallsTable)
    .set({ status: "paused", pauseReason, updatedAt: new Date() })
    .where(
      and(
        eq(batchCallsTable.id, batchCallId),
        eq(batchCallsTable.status, "running")
      )
    )
}

type Claim =
  | {
      kind: "claimed"
      recipient: {
        id: string
        toNumber: string
        variables: Record<string, string>
      }
    }
  | { kind: "idle" }
  | { kind: "stopped"; status: BatchCallStatus }
  | { kind: "out_of_credits" }

// SKIP LOCKED alone stops two ticks claiming the same recipient, but not both
// counting the same free slots and claiming different recipients past the limit.
// The batch row lock makes count-then-claim atomic per batch, and re-reading
// the status under it is what makes a pause or cancel take effect mid-tick.
function claimNextRecipient(batchCallId: string, organizationId: string) {
  return db.transaction(async (tx): Promise<Claim> => {
    const [batchCall] = await tx
      .select({
        status: batchCallsTable.status,
        maxConcurrentCalls: batchCallsTable.maxConcurrentCalls,
      })
      .from(batchCallsTable)
      .where(eq(batchCallsTable.id, batchCallId))
      .for("no key update")

    if (batchCall?.status !== "running") {
      return { kind: "stopped", status: batchCall?.status ?? "cancelled" }
    }

    const [{ active }] = await tx
      .select({ active: count() })
      .from(batchCallRecipientsTable)
      .where(
        and(
          eq(batchCallRecipientsTable.batchCallId, batchCallId),
          inArray(batchCallRecipientsTable.status, ACTIVE_STATUSES)
        )
      )

    if (active >= batchCall.maxConcurrentCalls) {
      return { kind: "idle" }
    }

    const [recipient] = await tx
      .select({
        id: batchCallRecipientsTable.id,
        toNumber: batchCallRecipientsTable.toNumber,
        variables: batchCallRecipientsTable.variables,
      })
      .from(batchCallRecipientsTable)
      .where(
        and(
          eq(batchCallRecipientsTable.batchCallId, batchCallId),
          eq(batchCallRecipientsTable.status, "pending")
        )
      )
      .orderBy(batchCallRecipientsTable.createdAt, batchCallRecipientsTable.id)
      .limit(1)
      .for("update", { skipLocked: true })

    if (!recipient) {
      return { kind: "idle" }
    }

    if (env.IS_CLOUD && !(await organizationHasCredits(organizationId, tx))) {
      await tx
        .update(batchCallsTable)
        .set({
          status: "paused",
          pauseReason: "insufficient_credits",
          updatedAt: new Date(),
        })
        .where(eq(batchCallsTable.id, batchCallId))

      return { kind: "out_of_credits" }
    }

    const now = new Date()
    await tx
      .update(batchCallRecipientsTable)
      .set({ status: "dialing", dialedAt: now, updatedAt: now })
      .where(eq(batchCallRecipientsTable.id, recipient.id))

    return { kind: "claimed", recipient }
  })
}

export async function tickBatchCall(
  batchCallId: string
): Promise<BatchCallTickResponse | null> {
  const batchCall = await db.query.batchCallsTable.findFirst({
    where: { id: batchCallId },
    columns: {
      id: true,
      organizationId: true,
      agentId: true,
      agentVersionId: true,
      status: true,
      schedule: true,
      maxConcurrentCalls: true,
    },
    with: {
      phoneNumber: {
        columns: {
          number: true,
          sipAddress: true,
          sipUsername: true,
          sipPassword: true,
        },
      },
    },
  })

  if (!batchCall) {
    return null
  }

  // A cancelled batch dials nobody, but its live calls still need the timeout so
  // a lost one does not read as in progress forever.
  if (batchCall.status === "cancelled") {
    await releaseStuckRecipients(batchCall)
    const [{ active }] = await db
      .select({ active: count() })
      .from(batchCallRecipientsTable)
      .where(
        and(
          eq(batchCallRecipientsTable.batchCallId, batchCallId),
          inArray(batchCallRecipientsTable.status, ACTIVE_STATUSES)
        )
      )

    return {
      status: batchCall.status,
      nextDelayMs: active > 0 ? IDLE_POLL_MS : null,
    }
  }

  if (batchCall.status !== "running") {
    return { status: batchCall.status, nextDelayMs: null }
  }

  await releaseStuckRecipients(batchCall)

  if (await completeIfFinished(batchCallId)) {
    return { status: "completed", nextDelayMs: null }
  }

  if (
    batchCall.schedule &&
    !isWithinBatchSchedule(batchCall.schedule, new Date())
  ) {
    return { status: "running", nextDelayMs: IDLE_POLL_MS }
  }

  const phoneNumber = batchCall.phoneNumber

  if (
    !phoneNumber?.sipAddress ||
    !phoneNumber.sipUsername ||
    !phoneNumber.sipPassword
  ) {
    // Only worth stopping for if someone is still to be dialed: with nothing
    // pending, the batch is just waiting for its last calls to report.
    const [pending] = await db
      .select({ id: batchCallRecipientsTable.id })
      .from(batchCallRecipientsTable)
      .where(
        and(
          eq(batchCallRecipientsTable.batchCallId, batchCallId),
          eq(batchCallRecipientsTable.status, "pending")
        )
      )
      .limit(1)

    if (!pending) {
      return { status: "running", nextDelayMs: TICK_INTERVAL_MS }
    }

    await pauseBatchCall(batchCallId, "phone_number_unavailable")
    return { status: "paused", nextDelayMs: null }
  }

  // Bounded because a failed placement frees its slot at once: with an unbounded
  // loop a trunk outage would burn every pending recipient in a single tick.
  for (let claimed = 0; claimed < batchCall.maxConcurrentCalls; claimed++) {
    const claim = await claimNextRecipient(
      batchCallId,
      batchCall.organizationId
    )

    if (claim.kind === "out_of_credits") {
      return { status: "paused", nextDelayMs: null }
    }

    // One more tick decides from the new status, so this path and a tick that
    // starts after the change cannot disagree.
    if (claim.kind === "stopped") {
      return { status: claim.status, nextDelayMs: TICK_INTERVAL_MS }
    }

    if (claim.kind === "idle") {
      break
    }

    try {
      await placeOutboundCall({
        agentId: batchCall.agentId,
        agentVersionId: batchCall.agentVersionId,
        toNumber: claim.recipient.toNumber,
        fromNumber: phoneNumber.number,
        sipAddress: phoneNumber.sipAddress,
        sipUsername: phoneNumber.sipUsername,
        sipPassword: phoneNumber.sipPassword,
        variables: claim.recipient.variables ?? {},
        batchCallId,
        batchCallRecipientId: claim.recipient.id,
      })
    } catch (error) {
      await updateBatchCallRecipient({
        batchCallId,
        recipientId: claim.recipient.id,
        status: "failed",
        error:
          error instanceof Error && error.message
            ? error.message.slice(0, MAX_ERROR_LENGTH)
            : RECIPIENT_ERRORS.placementFailed,
      })
    }
  }

  if (await completeIfFinished(batchCallId)) {
    return { status: "completed", nextDelayMs: null }
  }

  return { status: "running", nextDelayMs: TICK_INTERVAL_MS }
}
