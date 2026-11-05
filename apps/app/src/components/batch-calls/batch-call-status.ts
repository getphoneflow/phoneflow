import type {
  BatchCallPauseReason,
  BatchCallRecipientStatus,
  BatchCallStatus,
} from "@workspace/shared/api/batch-calls/types"
import type { TFunction } from "@/lib/i18n"

export function batchCallStatusLabels(
  t: TFunction
): Record<BatchCallStatus, string> {
  return {
    scheduled: t("components.batch_calls.status.scheduled"),
    running: t("components.batch_calls.status.running"),
    paused: t("components.batch_calls.status.paused"),
    completed: t("components.batch_calls.status.completed"),
    cancelled: t("components.batch_calls.status.cancelled"),
    triggered: t("components.batch_calls.status.triggered"),
  }
}

export function recipientStatusLabels(
  t: TFunction
): Record<BatchCallRecipientStatus, string> {
  return {
    pending: t("components.batch_calls.recipient_status.pending"),
    dialing: t("components.batch_calls.recipient_status.dialing"),
    in_progress: t("components.batch_calls.recipient_status.in_progress"),
    completed: t("components.batch_calls.recipient_status.completed"),
    no_answer: t("components.batch_calls.recipient_status.no_answer"),
    failed: t("components.batch_calls.recipient_status.failed"),
    cancelled: t("components.batch_calls.recipient_status.cancelled"),
  }
}

export function pauseReasonLabel(reason: BatchCallPauseReason, t: TFunction) {
  const labels: Record<BatchCallPauseReason, string> = {
    manual: t("components.batch_calls.pause_reason.manual"),
    insufficient_credits: t(
      "components.batch_calls.pause_reason.insufficient_credits"
    ),
    phone_number_unavailable: t(
      "components.batch_calls.pause_reason.phone_number_unavailable"
    ),
  }

  return labels[reason]
}

// Placement failures store the provider's own message, which has no translation.
export function recipientErrorLabel(error: string, t: TFunction) {
  const labels: Record<string, string> = {
    call_timed_out: t("components.batch_calls.recipient_error.call_timed_out"),
    call_start_failed: t(
      "components.batch_calls.recipient_error.call_start_failed"
    ),
    insufficient_credits: t(
      "components.batch_calls.recipient_error.insufficient_credits"
    ),
    agent_not_found: t(
      "components.batch_calls.recipient_error.agent_not_found"
    ),
    unexpected_call_status: t(
      "components.batch_calls.recipient_error.unexpected_call_status"
    ),
    placement_failed: t(
      "components.batch_calls.recipient_error.placement_failed"
    ),
    unknown_outcome: t(
      "components.batch_calls.recipient_error.unknown_outcome"
    ),
  }

  return labels[error] ?? error
}
