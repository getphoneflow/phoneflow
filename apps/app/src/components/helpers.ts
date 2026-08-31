type AgentVersionLabel = {
  number: number
  name?: string | null
}

export const DELETED_AGENT_LABEL = "Deleted agent"
export const DELETED_PHONE_NUMBER_LABEL = "Deleted phone number"
export const AGENT_VERSION_DRAFT_LABEL = "Latest (draft)"

export function formatAgentName(agent: { name: string } | null | undefined) {
  return agent?.name ?? DELETED_AGENT_LABEL
}

export function formatPhoneNumber(
  phoneNumber: { number: string } | null | undefined
) {
  return phoneNumber?.number ?? DELETED_PHONE_NUMBER_LABEL
}

export function formatAgentVersionLabel(
  version: AgentVersionLabel | null | undefined
) {
  if (!version) {
    return AGENT_VERSION_DRAFT_LABEL
  }

  const name = version.name?.trim()
  return name ? `V${version.number} - ${name}` : `V${version.number}`
}
