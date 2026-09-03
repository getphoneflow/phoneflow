import type {
  CallDispatchMetadata,
  CallVariableValues,
  CompleteCallRequest,
  CompleteCallResponse,
  StartCallResponse,
  StartInboundCallRequest,
  StartOutboundCallRequest,
  StartWebCallRequest,
  UnansweredCallRequest,
  UnansweredCallResponse,
} from "@workspace/shared/api/calls/types"
import { api } from "@/lib/api"
import { endCall } from "@/lib/end-call"
import { parseJsonObject } from "@/lib/json"

export function parseDispatchMetadata(metadata: string | undefined) {
  return parseJsonObject(metadata) as CallDispatchMetadata
}

export async function startCall(
  attributes: CallVariableValues,
  metadata: CallDispatchMetadata,
  livekitRoomName: string
) {
  const startedAt = new Date().toISOString()

  try {
    if (metadata.direction === "outbound") {
      if (!metadata.agentId || !metadata.fromNumber || !metadata.toNumber) {
        throw new Error(
          "Outbound calls require agentId, fromNumber and toNumber in dispatch metadata"
        )
      }

      return await api.post<StartCallResponse, StartOutboundCallRequest>(
        "/calls/start/outbound",
        {
          body: {
            agentId: metadata.agentId,
            agentVersionId: metadata.agentVersionId ?? null,
            fromNumber: metadata.fromNumber,
            toNumber: metadata.toNumber,
            livekitRoomName,
            startedAt,
            batchCallId: metadata.batchCallId ?? null,
          },
        }
      )
    }

    if (metadata.direction === "inbound") {
      const toNumber = attributes["sip.trunkPhoneNumber"]

      if (!toNumber) {
        throw new Error(
          "Inbound calls require a sip.trunkPhoneNumber attribute"
        )
      }

      return await api.post<StartCallResponse, StartInboundCallRequest>(
        "/calls/start/inbound",
        {
          body: {
            toNumber,
            fromNumber: attributes["sip.phoneNumber"] ?? "",
            livekitRoomName,
            startedAt,
          },
        }
      )
    }

    const agentId = attributes.agent_id

    if (!agentId) {
      throw new Error("Web calls require an agent_id attribute")
    }

    return await api.post<StartCallResponse, StartWebCallRequest>(
      "/calls/start/web",
      {
        body: {
          agentId,
          agentVersionId: attributes.agent_version_id || null,
          livekitRoomName,
          startedAt,
        },
      }
    )
  } catch (error) {
    await endCall()
    throw error
  }
}

export async function recordUnansweredCall(
  metadata: CallDispatchMetadata,
  livekitRoomName: string
) {
  const endedAt = new Date().toISOString()

  if (
    !metadata.agentId ||
    !metadata.fromNumber ||
    !metadata.toNumber ||
    !metadata.triggeredAt
  ) {
    throw new Error(
      "Unanswered calls require agentId, fromNumber, toNumber and triggeredAt in dispatch metadata"
    )
  }

  return await api.post<UnansweredCallResponse, UnansweredCallRequest>(
    "/calls/unanswered",
    {
      body: {
        agentId: metadata.agentId,
        agentVersionId: metadata.agentVersionId ?? null,
        fromNumber: metadata.fromNumber,
        toNumber: metadata.toNumber,
        livekitRoomName,
        startedAt: metadata.triggeredAt,
        endedAt,
        batchCallId: metadata.batchCallId ?? null,
      },
    }
  )
}

export function completeCall(
  callId: string,
  status: CompleteCallRequest["status"],
  transcript: CompleteCallRequest["transcript"],
  variables: CompleteCallRequest["variables"]
) {
  const endedAt = new Date().toISOString()

  return api.post<CompleteCallResponse, CompleteCallRequest>(
    "/calls/complete",
    {
      body: {
        callId,
        endedAt,
        status,
        transcript,
        variables,
      },
    }
  )
}
