import { Link } from "@tanstack/react-router"

import { DELETED_AGENT_LABEL } from "@/components/helpers"

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
  if (!agent) {
    return <span className="text-muted-foreground">{DELETED_AGENT_LABEL}</span>
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
