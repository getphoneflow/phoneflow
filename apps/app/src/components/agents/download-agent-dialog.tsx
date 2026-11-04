import { useMutation, useQuery } from "@tanstack/react-query"
import { useState } from "react"

import type {
  AgentConfigResponse,
  AgentResponse,
  AgentVersionConfigResponse,
  AgentVersionsListResponse,
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
} from "@workspace/ui/components/dialog"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { formatAgentVersionLabel } from "@/components/helpers"
import { api } from "@/lib/api"
import { type TFunction, useTranslation } from "@/lib/i18n"

type DownloadAgentDialogProps = {
  agent: Pick<AgentResponse, "id" | "name">
  open: boolean
  onOpenChange: (open: boolean) => void
}

function fetchAgentConfig(
  agentId: string,
  versionId: string | null,
  agentVersions: AgentVersionsListResponse,
  t: TFunction
) {
  if (versionId === null) {
    return api.get<AgentConfigResponse>(`/agents/${agentId}/config`)
  }

  const version = agentVersions.find((item) => item.id === versionId)
  if (!version) {
    throw new Error(
      t("components.agents.download_agent_dialog.errors.version_not_found")
    )
  }

  return api.get<AgentVersionConfigResponse>(
    `/agents/${agentId}/versions/${version.number}/config`
  )
}

export function DownloadAgentDialog({
  agent,
  open,
  onOpenChange,
}: DownloadAgentDialogProps) {
  const { t } = useTranslation()
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  )

  const { data: agentVersions = [] } = useQuery({
    queryKey: ["agents", "versions", agent.id],
    queryFn: () =>
      api.get<AgentVersionsListResponse>(`/agents/${agent.id}/versions`),
    enabled: open,
  })

  const downloadMutation = useMutation({
    mutationFn: () =>
      fetchAgentConfig(agent.id, selectedVersionId, agentVersions, t),
    onSuccess: (config) => {
      const version = selectedVersionId
        ? agentVersions.find((item) => item.id === selectedVersionId)
        : null
      const suffix = version ? `-v${version.number}` : ""
      const blob = new Blob([JSON.stringify(config, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${agent.name}${suffix}.json`
      link.click()
      URL.revokeObjectURL(url)
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        setSelectedVersionId(null)
        downloadMutation.reset()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("components.agents.download_agent_dialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("components.agents.download_agent_dialog.description", {
              name: agent.name,
            })}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="agent-version">
              {t("components.agents.download_agent_dialog.version.label")}
            </FieldLabel>
            <Select
              value={selectedVersionId ?? "draft"}
              onValueChange={(value) =>
                setSelectedVersionId(value === "draft" ? null : value)
              }
              disabled={downloadMutation.isPending}
            >
              <SelectTrigger
                id="agent-version"
                className="w-full text-foreground"
              >
                <SelectValue>
                  {formatAgentVersionLabel(
                    selectedVersionId
                      ? agentVersions.find(
                          (version) => version.id === selectedVersionId
                        )
                      : null,
                    t
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">
                  {formatAgentVersionLabel(null, t)}
                </SelectItem>
                {agentVersions.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    {formatAgentVersionLabel(version, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <DialogFooter className="mt-8">
          <DialogClose>
            <Button variant="outline" disabled={downloadMutation.isPending}>
              {t("common.actions.cancel")}
            </Button>
          </DialogClose>
          <Button
            disabled={downloadMutation.isPending}
            onClick={() => downloadMutation.mutate()}
          >
            {downloadMutation.isPending ? (
              <Spinner className="mx-8" />
            ) : (
              t("common.actions.download")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
