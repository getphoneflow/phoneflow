import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import type {
  AgentConfigResponse,
  UpdateAgentConfigRequest,
} from "@workspace/shared/api/agents/types"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  hasUnsavedAgentChanges,
  snapshotAgentConfig,
} from "@/components/flow/agent-config"
import { api } from "@/lib/api"
import { useAgentStore } from "@/stores/agent"

const AUTOSAVE_DELAY_MS = 1000

export function AgentAutoSave() {
  const queryClient = useQueryClient()
  const agentId = useAgentStore((state) => state.agent.id)
  const readOnly = useAgentStore((state) => state.readOnly)
  const config = useAgentStore((state) => state.config)
  const savedConfig = useAgentStore((state) => state.savedConfig)
  const markSaved = useAgentStore((state) => state.markSaved)
  const isDirty = hasUnsavedAgentChanges(config, savedConfig)
  const isDragging = config.nodes.some((node) => node.dragging)

  const saveMutation = useMutation({
    mutationFn: (nextConfig: AgentConfig) =>
      api.patch<AgentConfigResponse, UpdateAgentConfigRequest>(
        `/agents/${agentId}/config`,
        { body: { config: nextConfig } }
      ),
    onSuccess: (_serverConfig, nextConfig) => {
      markSaved(nextConfig)
      queryClient.invalidateQueries({
        queryKey: ["agents", "detail", agentId],
      })
    },
  })

  useEffect(() => {
    if (readOnly || !isDirty || isDragging || saveMutation.isPending) {
      return
    }

    const timeout = setTimeout(() => {
      saveMutation.mutate(snapshotAgentConfig(useAgentStore.getState().config))
    }, AUTOSAVE_DELAY_MS)

    return () => clearTimeout(timeout)
  }, [agentId, config, isDirty, isDragging, readOnly, saveMutation.isPending])

  if (readOnly) {
    return null
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-5">
      {saveMutation.isPending ? (
        <>
          <Spinner className="size-3" />
          Saving
        </>
      ) : (
        "Auto saved"
      )}
    </div>
  )
}
