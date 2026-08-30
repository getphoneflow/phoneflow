import type { z } from "zod"

import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import type {
  callListQuerySchema,
  callListSortBySchema,
  callNumericFilterOperatorSchema,
  callTranscriptSchema,
  completeCallRequestSchema,
  startInboundCallRequestSchema,
  startOutboundCallRequestSchema,
  startWebCallRequestSchema,
  triggerOutboundCallRequestSchema,
} from "./schemas"

export type CallChannel = "web_call" | "phone_call"

export type CallDirection = "inbound" | "outbound"

export type CallStatus = "in_progress" | "completed"

export type CallVariableValues = Record<string, string>

export type CallDispatchMetadata = {
  direction?: CallDirection
  agentId?: string
  agentVersionId?: string | null
  toNumber?: string
  fromNumber?: string
}

export type CallTranscript = z.infer<typeof callTranscriptSchema>

export type StartWebCallRequest = z.infer<typeof startWebCallRequestSchema>
export type StartInboundCallRequest = z.infer<
  typeof startInboundCallRequestSchema
>
export type StartOutboundCallRequest = z.infer<
  typeof startOutboundCallRequestSchema
>
export type TriggerOutboundCallRequest = z.infer<
  typeof triggerOutboundCallRequestSchema
>
export type CompleteCallRequest = z.infer<typeof completeCallRequestSchema>

export type StartCallResponse = {
  callId: string
  config: AgentConfig
}

export type CompleteCallResponse = {
  id: string
  durationMs: number
}

export type CallListQuery = z.infer<typeof callListQuerySchema>
export type CallListSortBy = z.infer<typeof callListSortBySchema>
export type CallNumericFilterOperator = z.infer<
  typeof callNumericFilterOperatorSchema
>

export type CallListItem = {
  id: string
  organizationId: string
  agentId: string
  agentVersionId: string | null
  channel: CallChannel
  direction: CallDirection
  status: CallStatus
  fromNumber: string | null
  toNumber: string | null
  sttModel: string
  llmModel: string
  ttsModel: string
  livekitRoomName: string
  startedAt: Date
  endedAt: Date | null
  durationMs: number | null
  sttCost: string | null
  llmCost: string | null
  ttsCost: string | null
  telephonyCost: string | null
  platformCost: string | null
  totalCost: string | null
  variables: CallVariableValues | null
  createdAt: Date
  updatedAt: Date
  agent: { name: string } | null
  agentVersion: { number: number } | null
}

export type CallListResponse = {
  items: CallListItem[]
  total: number
  page: number
  pageSize: number
}

export type CallDetailResponse = {
  id: string
  organizationId: string
  agentId: string
  agentVersionId: string | null
  channel: CallChannel
  direction: CallDirection
  status: CallStatus
  fromNumber: string | null
  toNumber: string | null
  sttModel: string
  llmModel: string
  ttsModel: string
  livekitRoomName: string
  startedAt: Date
  endedAt: Date | null
  durationMs: number | null
  sttCost: string | null
  llmCost: string | null
  ttsCost: string | null
  telephonyCost: string | null
  platformCost: string | null
  totalCost: string | null
  transcript: CallTranscript | null
  variables: CallVariableValues | null
  createdAt: Date
  updatedAt: Date
  agent: { name: string } | null
  agentVersion: { number: number } | null
}

export type CallDownloadResponse = CallDetailResponse[]

export type RequestCallDownloadResponse = {
  ok: true
}

export type TriggerOutboundCallResponse = {
  ok: true
}
