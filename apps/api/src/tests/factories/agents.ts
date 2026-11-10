import { db } from "@workspace/db/client"
import { agentsTable, agentVersionsTable } from "@workspace/db/schema/agents"
import { createDefaultAgentConfig } from "@workspace/shared/agents/templates/defaults"
import type { AgentConfig } from "@workspace/shared/api/agent-config/types"

export function agentConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return { ...createDefaultAgentConfig(), ...overrides }
}

export async function createAgent(
  organizationId: string,
  overrides: { name?: string; config?: AgentConfig } = {}
) {
  const [agent] = await db
    .insert(agentsTable)
    .values({
      id: crypto.randomUUID(),
      organizationId,
      name: overrides.name ?? "Test agent",
      config: overrides.config ?? agentConfig(),
    })
    .returning()
  return agent
}

export async function createAgentVersion(
  agentId: string,
  {
    number = 1,
    config = agentConfig(),
  }: { number?: number; config?: AgentConfig } = {}
) {
  const [version] = await db
    .insert(agentVersionsTable)
    .values({
      id: crypto.randomUUID(),
      agentId,
      number,
      name: `v${number}`,
      config,
    })
    .returning()
  return version
}
