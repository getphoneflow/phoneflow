import { db } from "@workspace/db/client"
import { callsTable } from "@workspace/db/schema/calls"
import { createDefaultAgentConfig } from "@workspace/shared/agents/templates/defaults"

export async function createCall(
  organizationId: string,
  agentId: string,
  overrides: Partial<typeof callsTable.$inferInsert> = {}
) {
  const config = createDefaultAgentConfig()
  const [call] = await db
    .insert(callsTable)
    .values({
      id: crypto.randomUUID(),
      organizationId,
      agentId,
      channel: "web_call",
      direction: "inbound",
      status: "in_progress",
      sttModel: config.stt.model,
      llmModel: config.llm.model,
      ttsModel: config.tts.model,
      livekitRoomName: `room-${crypto.randomUUID()}`,
      startedAt: new Date(),
      ...overrides,
    })
    .returning()
  return call
}

export async function getCall(callId: string) {
  const call = await db.query.callsTable.findFirst({ where: { id: callId } })
  if (!call) throw new Error(`Call ${callId} not found`)
  return call
}
