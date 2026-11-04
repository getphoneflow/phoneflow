import { Link } from "@tanstack/react-router"

import { formatAgentName } from "@/components/helpers"
import { useTranslation } from "@/lib/i18n"

type AgentReferenceLinkProps = {
  agentId: string
  agent: { name: string } | null
  agentVersionId?: string | null
  className?: string
}

export function AgentReferenceLink({
  agentId,
  agent,
  agentVersionId,
  className,
}: AgentReferenceLinkProps) {
  const { t } = useTranslation()

  if (!agent) {
    return (
      <span className="text-muted-foreground">{formatAgentName(null, t)}</span>
    )
  }

  return (
    <Link
      to="/agents/$agentId"
      params={{ agentId }}
      search={agentVersionId ? { agentVersionId } : undefined}
      className={className ?? "hover:underline"}
      onClick={(event) => {
        event.stopPropagation()
      }}
    >
      {agent.name}
    </Link>
  )
}
