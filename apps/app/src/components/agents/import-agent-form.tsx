import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { UploadIcon } from "lucide-react"
import { useState } from "react"

import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import type {
  CreateAgentRequest,
  CreateAgentResponse,
} from "@workspace/shared/api/agents/types"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Dropzone } from "@workspace/ui/components/dropzone"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { captureEvent } from "@/lib/analytics"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useTranslation } from "@/lib/i18n"

async function parseAgentConfigFile(file: File) {
  const text = await file.text()
  const parsed = JSON.parse(text)
  return parsed as AgentConfig
}

export function ImportAgentForm() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const canCreate = useCheckPermission({ agent: ["create"] })

  const createAgentMutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error(t("components.agents.import_agent_form.errors.no_file"))
      }
      const config = await parseAgentConfigFile(file)
      return api.post<CreateAgentResponse, CreateAgentRequest>("/agents", {
        body: {
          name: "Imported agent",
          config,
        },
      })
    },
    onSuccess: (agent) => {
      captureEvent("agent_created", { agent_id: agent.id })
      setOpen(false)
      setFile(null)
      navigate({
        to: "/agents/$agentId",
        params: { agentId: agent.id },
      })
      queryClient.invalidateQueries({ queryKey: ["agents", "list"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        setFile(null)
        createAgentMutation.reset()
      }}
    >
      <DialogTrigger disabled={!canCreate}>
        <Button variant="outline" disabled={!canCreate}>
          <UploadIcon />
          {t("components.agents.import_agent_form.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("components.agents.import_agent_form.title")}
          </DialogTitle>
          <DialogDescription>
            {t("components.agents.import_agent_form.description")}
          </DialogDescription>
        </DialogHeader>

        <Dropzone
          accept=".json"
          value={file}
          onValueChange={setFile}
          disabled={createAgentMutation.isPending}
          placeholder={t("components.agents.import_agent_form.placeholder")}
        />

        <DialogFooter>
          <DialogClose>
            <Button variant="outline" disabled={createAgentMutation.isPending}>
              {t("common.actions.cancel")}
            </Button>
          </DialogClose>
          <Button
            disabled={!file || createAgentMutation.isPending}
            onClick={() => createAgentMutation.mutate()}
          >
            {createAgentMutation.isPending ? (
              <Spinner className="mx-8" />
            ) : (
              t("components.agents.import_agent_form.submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
