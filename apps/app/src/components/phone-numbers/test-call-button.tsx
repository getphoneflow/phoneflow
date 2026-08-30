import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { PhoneOutgoingIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"

import type {
  AgentConfigResponse,
  AgentsListResponse,
  AgentVersionConfigResponse,
  AgentVersionsListResponse,
} from "@workspace/shared/api/agents/types"
import { triggerOutboundCallRequestSchema } from "@workspace/shared/api/calls/schemas"
import type {
  TriggerOutboundCallRequest,
  TriggerOutboundCallResponse,
} from "@workspace/shared/api/calls/types"
import type { PhoneNumberListResponse } from "@workspace/shared/api/phone-numbers/types"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
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
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  AGENT_VERSION_DRAFT_LABEL,
  formatAgentVersionLabel,
} from "@/components/helpers"
import { VariableValuesFields } from "@/components/variable-values-fields"
import { useVariableValues } from "@/hooks/use-variable-values"
import { api } from "@/lib/api"
import { useCheckPermission } from "@/lib/auth/permissions"

type OutboundFormValues = Omit<TriggerOutboundCallRequest, "variables">

function hasSipConnection(phoneNumber: PhoneNumberListResponse[number]) {
  return Boolean(
    phoneNumber.sipAddress && phoneNumber.sipUsername && phoneNumber.sipPassword
  )
}

export function TestCallButton() {
  const [open, setOpen] = useState(false)
  const canCreate = useCheckPermission({ calls: ["create"] })

  const form = useForm<OutboundFormValues>({
    resolver: zodResolver(
      triggerOutboundCallRequestSchema.omit({ variables: true })
    ),
    defaultValues: {
      phoneNumberId: "",
      toNumber: "",
      agentId: "",
      agentVersionId: null,
    },
  })

  const selectedAgentId = form.watch("agentId") || undefined
  const selectedVersionId = form.watch("agentVersionId") ?? null

  const { data: phoneNumbers = [] } = useQuery({
    queryKey: ["phone-numbers"],
    queryFn: () => api.get<PhoneNumberListResponse>("/phone-numbers"),
    enabled: open,
  })

  const callablePhoneNumbers = useMemo(
    () => phoneNumbers.filter(hasSipConnection),
    [phoneNumbers]
  )

  const { data: agents = [] } = useQuery({
    queryKey: ["agents", "list"],
    queryFn: () => api.get<AgentsListResponse>("/agents"),
    enabled: open,
  })

  const { data: agentVersions = [] } = useQuery({
    queryKey: ["agents", "versions", selectedAgentId],
    queryFn: () =>
      api.get<AgentVersionsListResponse>(`/agents/${selectedAgentId}/versions`),
    enabled: open && Boolean(selectedAgentId),
  })

  const selectedVersionNumber = selectedVersionId
    ? agentVersions.find((version) => version.id === selectedVersionId)?.number
    : undefined

  const { data: config } = useQuery({
    queryKey: ["agent-config", selectedAgentId, selectedVersionId],
    queryFn: () =>
      selectedVersionId
        ? api.get<AgentVersionConfigResponse>(
            `/agents/${selectedAgentId}/versions/${selectedVersionNumber}/config`
          )
        : api.get<AgentConfigResponse>(`/agents/${selectedAgentId}/config`),
    enabled:
      open &&
      Boolean(selectedAgentId) &&
      (!selectedVersionId || selectedVersionNumber !== undefined),
  })

  const variables = useVariableValues(config)

  const callMutation = useMutation({
    mutationFn: (values: TriggerOutboundCallRequest) =>
      api.post<TriggerOutboundCallResponse, TriggerOutboundCallRequest>(
        "/calls/outbound",
        { body: values }
      ),
    onSuccess: () => {
      toast.success("Outbound call started")
      form.reset()
      setOpen(false)
      variables.reset()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (formValues: OutboundFormValues) => {
    callMutation.mutate({
      ...formValues,
      variables: variables.toRecord(),
    })
  }

  const readOnly = !canCreate || callMutation.isPending

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        form.reset()
        variables.reset()
        callMutation.reset()
      }}
    >
      <SheetTrigger>
        <Button variant="outline">
          <PhoneOutgoingIcon />
          Test call
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Test call</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-4">
            <FieldGroup>
              <Controller
                name="phoneNumberId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Call from</FieldLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      readOnly={readOnly}
                    >
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder="Select a phone number">
                          {field.value
                            ? callablePhoneNumbers.find(
                                (phoneNumber) => phoneNumber.id === field.value
                              )?.number
                            : "Select a phone number"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {callablePhoneNumbers.map((phoneNumber) => (
                          <SelectItem
                            key={phoneNumber.id}
                            value={phoneNumber.id}
                          >
                            {phoneNumber.number}
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
                name="toNumber"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Call to</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      placeholder="+14155551234"
                      autoComplete="off"
                      readOnly={readOnly}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="agentId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Agent</FieldLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={(value) => {
                        field.onChange(value)
                        form.setValue("agentVersionId", null)
                      }}
                      readOnly={readOnly}
                    >
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder="Select an agent">
                          {field.value
                            ? agents.find((agent) => agent.id === field.value)
                                ?.name
                            : "Select an agent"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
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
                        selectedAgentId
                          ? (field.value ?? "draft")
                          : "no-version"
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

              <VariableValuesFields variables={variables} readOnly={readOnly} />
            </FieldGroup>
          </div>

          <SheetFooter>
            <Button type="submit" disabled={readOnly}>
              {callMutation.isPending ? (
                <Spinner />
              ) : (
                <>
                  <PhoneOutgoingIcon />
                  Start call
                </>
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
