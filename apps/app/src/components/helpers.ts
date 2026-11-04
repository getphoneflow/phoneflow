import type { TFunction } from "@/lib/i18n"

type AgentVersionLabel = {
  number: number
  name?: string | null
}

export function formatAgentName(
  agent: { name: string } | null | undefined,
  t: TFunction
) {
  return agent?.name ?? t("components.helpers.deleted_agent")
}

export function formatPhoneNumber(
  phoneNumber: { number: string } | null | undefined,
  t: TFunction
) {
  return phoneNumber?.number ?? t("components.helpers.deleted_phone_number")
}

export function formatAgentVersionLabel(
  version: AgentVersionLabel | null | undefined,
  t: TFunction
) {
  if (!version) {
    return t("components.helpers.agent_version_draft")
  }

  const name = version.name?.trim()
  return name ? `V${version.number} - ${name}` : `V${version.number}`
}
