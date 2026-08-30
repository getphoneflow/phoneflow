type AgentVersionLabel = {
  number: number
  name?: string | null
}

export const AGENT_VERSION_DRAFT_LABEL = "Latest (draft)"

export function formatAgentVersionLabel(
  version: AgentVersionLabel | null | undefined
) {
  if (!version) {
    return AGENT_VERSION_DRAFT_LABEL
  }

  const name = version.name?.trim()
  return name ? `V${version.number} - ${name}` : `V${version.number}`
}
