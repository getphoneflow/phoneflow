import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { useState } from "react"

import type {
  AgentConfigResponse,
  AgentVersionConfigResponse,
  AgentVersionResponse,
} from "@workspace/shared/api/agents/types"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { UnsavedChangesDialog } from "@/components/agents/unsaved-changes-dialog"
import { hasUnsavedAgentChanges } from "@/components/flow/agent-config"
import { formatAgentVersionLabel } from "@/components/helpers"
import { UserDateTime } from "@/components/user-timezone-provider"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useAgentStore } from "@/stores/agent"

export function AgentVersionSelector() {
  const queryClient = useQueryClient()
  const agent = useAgentStore((state) => state.agent)
  const activeVersionNumber = useAgentStore(
    (state) => state.activeVersionNumber
  )
  const loadAgentConfig = useAgentStore((state) => state.loadAgentConfig)
  const loadAgentVersionConfig = useAgentStore(
    (state) => state.loadAgentVersionConfig
  )
  const canUpdateAgent = useCheckPermission({ agent: ["update"] })
  const hasUnsavedChanges = useAgentStore((state) =>
    hasUnsavedAgentChanges(state.config, state.savedConfig)
  )
  const [pending, setPending] = useState<"draft" | AgentVersionResponse | null>(
    null
  )

  const draftVersionNumber =
    agent.versions.length > 0
      ? Math.max(...agent.versions.map((version) => version.number)) + 1
      : 1
  const isDraftSelected = activeVersionNumber === null

  const fetchVersionMutation = useMutation({
    mutationFn: (version: AgentVersionResponse) =>
      api.get<AgentVersionConfigResponse>(
        `/agents/${agent.id}/versions/${version.number}/config`
      ),
    onSuccess: (config, version) => {
      loadAgentVersionConfig(config, version)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  function apply(next: "draft" | AgentVersionResponse) {
    if (next === "draft") {
      const config = queryClient.getQueryData<AgentConfigResponse>([
        "agents",
        "config",
        agent.id,
      ])
      if (config) {
        loadAgentConfig(config, !canUpdateAgent)
      }
      return
    }

    fetchVersionMutation.mutate(next)
  }

  function select(next: "draft" | AgentVersionResponse) {
    if (hasUnsavedChanges) {
      setPending(next)
      return
    }

    apply(next)
  }

  return (
    <>
      <UnsavedChangesDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null)
          }
        }}
        onDiscard={() => {
          if (pending) {
            apply(pending)
          }
          setPending(null)
        }}
      />

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            variant="outline"
            className="w-28 justify-between"
            disabled={fetchVersionMutation.isPending}
          >
            {fetchVersionMutation.isPending ? (
              <Spinner className="mx-auto" />
            ) : (
              <>
                <div>
                  V{isDraftSelected ? draftVersionNumber : activeVersionNumber}
                  {isDraftSelected ? " (Draft)" : null}
                </div>
                <ChevronDownIcon />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-120 w-65">
          <DropdownMenuItem
            onClick={() => {
              if (!isDraftSelected) {
                select("draft")
              }
            }}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate">V{draftVersionNumber} (Draft)</div>
              <div className="truncate text-xs text-muted-foreground">
                Updated <UserDateTime value={agent.updatedAt} />
              </div>
            </div>
            <CheckIcon className={isDraftSelected ? undefined : "invisible"} />
          </DropdownMenuItem>

          {agent.versions.map((version) => {
            const isSelected = activeVersionNumber === version.number

            return (
              <DropdownMenuItem
                key={version.id}
                onClick={() => {
                  if (!isSelected) {
                    select(version)
                  }
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    {formatAgentVersionLabel(version)}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    Published <UserDateTime value={version.publishedAt} />
                  </div>
                </div>
                <CheckIcon className={isSelected ? undefined : "invisible"} />
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
