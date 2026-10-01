import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  CopyIcon,
  DownloadIcon,
  HistoryIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react"
import { useState } from "react"

import type {
  AgentResponse,
  DuplicateAgentResponse,
} from "@workspace/shared/api/agents/types"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { toast } from "@workspace/ui/components/sonner"
import { DeleteAgentDialog } from "@/components/agents/delete-agent-dialog"
import { DownloadAgentDialog } from "@/components/agents/download-agent-dialog"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"

export function AgentEditorActions({
  agent,
}: {
  agent: Pick<AgentResponse, "id" | "name">
}) {
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canCreate = useCheckPermission({ agent: ["create"] })
  const canDelete = useCheckPermission({ agent: ["delete"] })

  const duplicateAgentMutation = useMutation({
    mutationFn: () =>
      api.post<DuplicateAgentResponse, never>(
        `/agents/${agent.id}/duplicate`,
        {}
      ),
    onSuccess: (duplicated) => {
      toast.success("Agent duplicated")
      queryClient.invalidateQueries({ queryKey: ["agents", "list"] })
      navigate({
        to: "/agents/$agentId",
        params: { agentId: duplicated.id },
      })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <div className="flex">
      <DownloadAgentDialog
        agent={agent}
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
      />
      <DeleteAgentDialog
        agent={agent}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => navigate({ to: "/agents" })}
      />
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Open actions for ${agent.name}`}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4}>
          <DropdownMenuItem
            disabled={!canCreate || duplicateAgentMutation.isPending}
            onClick={() => duplicateAgentMutation.mutate()}
          >
            <CopyIcon />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDownloadOpen(true)}>
            <DownloadIcon />
            Download
          </DropdownMenuItem>
          <DropdownMenuItem
            nativeButton={false}
            render={<Link to="/calls" search={{ agentIds: agent.id }} />}
          >
            <HistoryIcon />
            View calls
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={!canDelete}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
