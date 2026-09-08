import { useMutation, useQueryClient } from "@tanstack/react-query"
import { SaveIcon } from "lucide-react"

import type {
  AgentConfigResponse,
  UpdateAgentConfigRequest,
} from "@workspace/shared/api/agents/types"
import { Button } from "@workspace/ui/components/button"
import { toast } from "@workspace/ui/components/sonner"
import { toServerAgentConfig } from "@/components/flow/agent-config"
import { api } from "@/lib/api"
import { useAgentStore } from "@/stores/agent"

export function SaveAgentButton() {
  const queryClient = useQueryClient()
  const agent = useAgentStore((state) => state.agent)
  const readOnly = useAgentStore((state) => state.readOnly)
  const config = useAgentStore((state) => state.config)
  const markSaved = useAgentStore((state) => state.markSaved)

  const saveMutation = useMutation({
    mutationFn: () =>
      api.patch<AgentConfigResponse, UpdateAgentConfigRequest>(
        `/agents/${agent.id}/config`,
        { body: { config: toServerAgentConfig(config) } }
      ),
    onSuccess: () => {
      markSaved()
      toast.success("Agent saved")
      queryClient.invalidateQueries({
        queryKey: ["agents", "detail", agent.id],
      })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <Button
      variant="outline"
      disabled={readOnly || saveMutation.isPending}
      onClick={() => saveMutation.mutate()}
    >
      <SaveIcon />
      Save
    </Button>
  )
}
