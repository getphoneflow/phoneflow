import { useMutation, useQueryClient } from "@tanstack/react-query"

import type {
  UpdateAgentNameRequest,
  UpdateAgentNameResponse,
} from "@workspace/shared/api/agents/types"
import { InlineEditableField } from "@workspace/ui/components/inline-editable-field"
import { toast } from "@workspace/ui/components/sonner"
import { api } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"
import { useAgentStore } from "@/stores/agent"

export function AgentNameField() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const agent = useAgentStore((state) => state.agent)
  const readOnly = useAgentStore((state) => state.readOnly)

  const updateNameMutation = useMutation({
    mutationFn: (name: string) =>
      api.patch<UpdateAgentNameResponse, UpdateAgentNameRequest>(
        `/agents/${agent.id}/name`,
        { body: { name } }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["agents", "detail", agent.id],
      })
      queryClient.invalidateQueries({ queryKey: ["agents", "list"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <InlineEditableField
      value={agent.name}
      onChange={(name) => updateNameMutation.mutate(name)}
      placeholder={t("components.agents.agent_name_field.placeholder")}
      disabled={readOnly}
    />
  )
}
