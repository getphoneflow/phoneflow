import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import {
  CopyIcon,
  DownloadIcon,
  HistoryIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { useState } from "react"

import type {
  AgentsListItem,
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
import { EditAgentNameDialog } from "@/components/agents/edit-agent-name-dialog"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"

export function AgentRowActions({ agent }: { agent: AgentsListItem }) {
  const [editNameOpen, setEditNameOpen] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const queryClient = useQueryClient()
  const canUpdate = useCheckPermission({ agent: ["update"] })
  const canCreate = useCheckPermission({ agent: ["create"] })
  const canDelete = useCheckPermission({ agent: ["delete"] })

  const duplicateAgentMutation = useMutation({
    mutationFn: () =>
      api.post<DuplicateAgentResponse, never>(
        `/agents/${agent.id}/duplicate`,
        {}
      ),
    onSuccess: () => {
      toast.success("Agent duplicated")
      queryClient.invalidateQueries({ queryKey: ["agents", "list"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <>
      <EditAgentNameDialog
        agent={agent}
        open={editNameOpen}
        onOpenChange={setEditNameOpen}
      />
      <DownloadAgentDialog
        agent={agent}
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
      />
      <DeleteAgentDialog
        agent={agent}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Open actions for ${agent.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4}>
          <DropdownMenuItem
            disabled={!canUpdate}
            onClick={() => setEditNameOpen(true)}
          >
            <PencilIcon />
            Edit name
          </DropdownMenuItem>
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
    </>
  )
}
