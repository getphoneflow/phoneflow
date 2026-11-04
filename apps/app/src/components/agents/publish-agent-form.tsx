import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { UploadIcon } from "lucide-react"
import { lazy, Suspense, useState } from "react"
import { Controller, useForm } from "react-hook-form"

import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import { publishAgentRequestSchema } from "@workspace/shared/api/agents/schemas"
import type {
  AgentVersionConfigResponse,
  AgentVersionResponse,
  PublishAgentRequest,
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"
import { areAgentConfigsEqual } from "@/components/flow/agent-config"
import { captureEvent } from "@/lib/analytics"
import { api } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"
import { zodResolverI18n } from "@/lib/zod-resolver"
import { useAgentStore } from "@/stores/agent"

const AgentConfigDiff = lazy(() =>
  import("@/components/agents/agent-config-diff").then((module) => ({
    default: module.AgentConfigDiff,
  }))
)

function PublishAgentConfigDiff({
  agentId,
  versionNumber,
  savedConfig,
}: {
  agentId: string
  versionNumber: number
  savedConfig: AgentConfig
}) {
  const { data: previousConfig } = useSuspenseQuery({
    queryKey: ["agents", "versions", agentId, versionNumber, "config"],
    queryFn: () =>
      api.get<AgentVersionConfigResponse>(
        `/agents/${agentId}/versions/${versionNumber}/config`
      ),
  })

  return <AgentConfigDiff oldConfig={previousConfig} newConfig={savedConfig} />
}

export function PublishAgentForm() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const agent = useAgentStore((state) => state.agent)
  const savedConfig = useAgentStore((state) => state.savedConfig)
  const canPublish = useAgentStore(
    (state) =>
      !state.readOnly &&
      state.validation.success &&
      areAgentConfigsEqual(state.validation.data, state.savedConfig)
  )
  const latestVersion = agent.versions[0]
  const nextVersionNumber = (latestVersion?.number ?? 0) + 1

  const form = useForm<PublishAgentRequest>({
    resolver: zodResolverI18n(publishAgentRequestSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const publishAgentMutation = useMutation({
    mutationFn: (values: PublishAgentRequest) =>
      api.post<AgentVersionResponse, PublishAgentRequest>(
        `/agents/${agent.id}/publish`,
        { body: values }
      ),
    onSuccess: (publishedVersion) => {
      captureEvent("agent_published", {
        agent_id: agent.id,
        agent_version_id: publishedVersion.id,
        version_number: publishedVersion.number,
      })
      toast.success(
        t("components.agents.publish_agent_form.toasts.published", {
          number: publishedVersion.number,
        })
      )
      form.reset()
      setOpen(false)
      queryClient.invalidateQueries({
        queryKey: ["agents", "detail", agent.id],
      })
      queryClient.invalidateQueries({
        queryKey: ["agents", "versions", agent.id],
      })
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
        publishAgentMutation.reset()
      }}
    >
      <Button disabled={!canPublish} onClick={() => setOpen(true)}>
        <UploadIcon />
        {t("components.agents.publish_agent_form.trigger")}
      </Button>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            {t("components.agents.publish_agent_form.title", {
              number: nextVersionNumber,
            })}
          </DialogTitle>
          <DialogDescription>
            {t("components.agents.publish_agent_form.description")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((values) =>
            publishAgentMutation.mutate(values)
          )}
          noValidate
        >
          <FieldGroup className="grid grid-cols-2">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t("components.agents.publish_agent_form.name.label")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    value={field.value ?? ""}
                    aria-invalid={fieldState.invalid}
                    placeholder={t(
                      "components.agents.publish_agent_form.name.placeholder"
                    )}
                    autoComplete="off"
                    disabled={publishAgentMutation.isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t(
                      "components.agents.publish_agent_form.version_description.label"
                    )}
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    value={field.value ?? ""}
                    aria-invalid={fieldState.invalid}
                    placeholder={t(
                      "components.agents.publish_agent_form.version_description.placeholder"
                    )}
                    disabled={publishAgentMutation.isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <div className="my-8 h-100 overflow-auto">
            <Suspense fallback={<Skeleton className="size-full" />}>
              {open &&
                (latestVersion ? (
                  <PublishAgentConfigDiff
                    agentId={agent.id}
                    versionNumber={latestVersion.number}
                    savedConfig={savedConfig}
                  />
                ) : (
                  <AgentConfigDiff oldConfig={null} newConfig={savedConfig} />
                ))}
            </Suspense>
          </div>

          <DialogFooter>
            <DialogClose>
              <Button
                variant="outline"
                disabled={publishAgentMutation.isPending}
              >
                {t("common.actions.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={publishAgentMutation.isPending}>
              {publishAgentMutation.isPending ? (
                <Spinner className="mx-5" />
              ) : (
                t("components.agents.publish_agent_form.submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
