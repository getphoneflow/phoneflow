import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"
import { useEffect } from "react"

import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import type {
  AgentConfigResponse,
  UpdateAgentConfigRequest,
} from "@workspace/shared/api/agents/types"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { areAgentConfigsEqual } from "@/components/flow/agent-config"
import { api } from "@/lib/api"
import { useAgentStore } from "@/stores/agent"

const AUTOSAVE_DELAY_MS = 1000

export function AgentAutoSave() {
  const queryClient = useQueryClient()
  const agentId = useAgentStore((state) => state.agent.id)
  const readOnly = useAgentStore((state) => state.readOnly)
  const savedConfig = useAgentStore((state) => state.savedConfig)
  const markSaved = useAgentStore((state) => state.markSaved)
  const validation = useAgentStore((state) => state.validation)
  const globalErrors = useAgentStore((state) => state.flowErrors.global)
  const dragging = useAgentStore((state) =>
    state.config.nodes.some((node) => node.dragging)
  )

  const nextConfig = validation.success ? validation.data : null
  const isDirty =
    nextConfig !== null && !areAgentConfigsEqual(nextConfig, savedConfig)

  const saveMutation = useMutation({
    mutationFn: (config: AgentConfig) =>
      api.patch<AgentConfigResponse, UpdateAgentConfigRequest>(
        `/agents/${agentId}/config`,
        { body: { config } }
      ),
    onSuccess: (_serverConfig, config) => {
      markSaved(config)
      queryClient.invalidateQueries({
        queryKey: ["agents", "detail", agentId],
      })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  useEffect(() => {
    if (
      readOnly ||
      dragging ||
      !isDirty ||
      !nextConfig ||
      saveMutation.isPending
    ) {
      return
    }

    const timeout = setTimeout(() => {
      saveMutation.mutate(nextConfig)
    }, AUTOSAVE_DELAY_MS)

    return () => clearTimeout(timeout)
  }, [dragging, isDirty, nextConfig, readOnly, saveMutation.isPending])

  if (readOnly) {
    return null
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-4">
      {saveMutation.isPending ? (
        <>
          <Spinner className="size-3" />
          Saving
        </>
      ) : validation.success ? (
        <>
          <CircleCheckIcon className="size-3" />
          Auto saved
        </>
      ) : (
        <span className="flex items-center gap-1.5 text-destructive">
          <CircleAlertIcon className="size-3" />
          {globalErrors.length > 0 ? globalErrors.join(", ") : "Fix error"}
        </span>
      )}
    </div>
  )
}
