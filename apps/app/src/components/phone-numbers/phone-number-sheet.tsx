import { zodResolver } from "@hookform/resolvers/zod"
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Suspense } from "react"
import { Controller, useForm } from "react-hook-form"

import type {
  AgentsListResponse,
  AgentVersionsListResponse,
} from "@workspace/shared/api/agents/types"
import { updatePhoneNumberRequestSchema } from "@workspace/shared/api/phone-numbers/schemas"
import type {
  PhoneNumberListResponse,
  PhoneNumberResponse,
  UpdatePhoneNumberRequest,
} from "@workspace/shared/api/phone-numbers/types"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  AGENT_VERSION_DRAFT_LABEL,
  formatAgentVersionLabel,
} from "@/components/helpers"
import { SheetSkeleton } from "@/components/sheet-skeleton"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"

function PhoneNumberBody({
  phoneNumberId,
  onClose,
}: {
  phoneNumberId: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const canUpdate = useCheckPermission({ phoneNumber: ["update"] })

  const { data: phoneNumbers } = useSuspenseQuery({
    queryKey: ["phone-numbers"],
    queryFn: () => api.get<PhoneNumberListResponse>("/phone-numbers"),
  })

  const { data: agents } = useSuspenseQuery({
    queryKey: ["agents", "list"],
    queryFn: () => api.get<AgentsListResponse>("/agents"),
  })

  const phoneNumber = phoneNumbers.find((item) => item.id === phoneNumberId)

  const form = useForm<UpdatePhoneNumberRequest>({
    resolver: zodResolver(updatePhoneNumberRequestSchema),
    defaultValues: {
      agentId: phoneNumber?.agentId ?? null,
      agentVersionId: phoneNumber?.agentVersionId ?? null,
    },
  })

  const selectedAgentId = form.watch("agentId") ?? undefined

  const { data: agentVersions = [] } = useQuery({
    queryKey: ["agents", "versions", selectedAgentId],
    queryFn: () =>
      api.get<AgentVersionsListResponse>(`/agents/${selectedAgentId}/versions`),
    enabled: Boolean(selectedAgentId),
  })

  const saveMutation = useMutation({
    mutationFn: (values: UpdatePhoneNumberRequest) =>
      api.patch<PhoneNumberResponse, UpdatePhoneNumberRequest>(
        `/phone-numbers/${phoneNumberId}`,
        { body: values }
      ),
    onSuccess: () => {
      onClose()
      queryClient.invalidateQueries({ queryKey: ["phone-numbers"] })
      queryClient.invalidateQueries({ queryKey: ["agents", "list"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (!phoneNumber) {
    return null
  }

  const readOnly = !canUpdate || saveMutation.isPending

  return (
    <>
      <SheetHeader>
        <SheetTitle>Inbound calls</SheetTitle>
      </SheetHeader>

      <form
        onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        noValidate
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex-1 overflow-y-auto px-4">
          <FieldGroup>
            <Controller
              name="agentId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Response agent</FieldLabel>
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(value) => {
                      const agentId = value === "none" ? null : value
                      field.onChange(agentId)
                      form.setValue("agentVersionId", null)
                    }}
                    readOnly={readOnly}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue>
                        {field.value
                          ? agents.find((agent) => agent.id === field.value)
                              ?.name
                          : "No agent"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No agent</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="agentVersionId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Version</FieldLabel>
                  <Select
                    value={
                      selectedAgentId ? (field.value ?? "draft") : "no-version"
                    }
                    onValueChange={(value) =>
                      field.onChange(value === "draft" ? null : value)
                    }
                    readOnly={!selectedAgentId || readOnly}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue>
                        {!selectedAgentId
                          ? "No version"
                          : formatAgentVersionLabel(
                              field.value
                                ? agentVersions.find(
                                    (version) => version.id === field.value
                                  )
                                : null
                            )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">
                        {AGENT_VERSION_DRAFT_LABEL}
                      </SelectItem>
                      {agentVersions.map((version) => (
                        <SelectItem key={version.id} value={version.id}>
                          {formatAgentVersionLabel(version)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </div>

        <SheetFooter>
          <Button type="submit" disabled={readOnly}>
            {saveMutation.isPending ? <Spinner /> : "Save"}
          </Button>
        </SheetFooter>
      </form>
    </>
  )
}

export function PhoneNumberSheet({
  phoneNumberId,
  open,
  onClose,
}: {
  phoneNumberId?: string
  open: boolean
  onClose: () => void
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <SheetContent className="sm:max-w-md">
        <Suspense fallback={<SheetSkeleton />}>
          {phoneNumberId ? (
            <PhoneNumberBody
              key={phoneNumberId}
              phoneNumberId={phoneNumberId}
              onClose={onClose}
            />
          ) : null}
        </Suspense>
      </SheetContent>
    </Sheet>
  )
}
