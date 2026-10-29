import { cn } from "cn"
import { Plus, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import type { DynamicVariable } from "@workspace/shared/api/agent-config/types"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { useAgentStore } from "@/stores/agent"
import { FlowSidePanelBase } from "./base"

export function VariablesPanel() {
  const readOnly = useAgentStore((state) => state.readOnly)
  const config = useAgentStore((state) => state.config)
  const setConfig = useAgentStore((state) => state.setConfig)
  const inputs = config.dynamicVariables ?? []
  const extracted = useMemo(() => extractedVariables(config), [config])
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const system = [
    {
      key: "date",
      value: now.toLocaleDateString("en-US", {
        timeZone: config.timezone,
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      note: false,
    },
    {
      key: "time",
      value: now.toLocaleTimeString("en-US", {
        timeZone: config.timezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      note: false,
    },
    { key: "timezone", value: config.timezone, note: false },
    { key: "direction", value: "web, inbound, or outbound", note: true },
    { key: "phone_number", value: "The user's number", note: true },
    { key: "agent_number", value: "The agent's number", note: true },
  ]

  function updateInputs(dynamicVariables: DynamicVariable[]) {
    setConfig({ ...config, dynamicVariables })
  }

  function updateInput(index: number, patch: Partial<DynamicVariable>) {
    updateInputs(
      inputs.map((variable, variableIndex) => {
        if (variableIndex !== index) {
          return variable
        }
        const next = { ...variable, ...patch }
        if (!next.defaultValue) {
          return { key: next.key }
        }
        return next
      })
    )
  }

  return (
    <FlowSidePanelBase title="Variables">
      <FieldGroup>
        <Field>
          <FieldLabel>Inputs</FieldLabel>
          <FieldDescription>
            Values passed in when the call starts
          </FieldDescription>
          {inputs.map((variable, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-md border border-border p-3"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={variable.key}
                  placeholder="variable_name"
                  readOnly={readOnly}
                  onChange={(event) =>
                    updateInput(index, { key: event.target.value })
                  }
                />
                <Button
                  variant="ghost"
                  className="text-destructive!"
                  size="icon-sm"
                  disabled={readOnly}
                  onClick={() =>
                    updateInputs(
                      inputs.filter(
                        (_, variableIndex) => variableIndex !== index
                      )
                    )
                  }
                >
                  <Trash2 />
                </Button>
              </div>
              <Input
                value={variable.defaultValue ?? ""}
                placeholder="Default value"
                readOnly={readOnly}
                onChange={(event) =>
                  updateInput(index, { defaultValue: event.target.value })
                }
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={readOnly}
            onClick={() => updateInputs([...inputs, { key: "" }])}
          >
            <Plus />
            Add variable
          </Button>
        </Field>

        {extracted.length > 0 ? (
          <Field>
            <FieldLabel>Extracted</FieldLabel>
            <FieldDescription>
              Values filled in during the call
            </FieldDescription>
            {extracted.map((key) => (
              <p key={key} className="font-mono text-sm">
                {key}
              </p>
            ))}
          </Field>
        ) : null}

        <Field>
          <FieldLabel>System</FieldLabel>
          <FieldDescription>
            Built-in variables always available
          </FieldDescription>
          {system.map((variable) => (
            <div
              key={variable.key}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="shrink-0 font-mono">{variable.key}</span>
              <span
                className={cn(
                  "min-w-0 truncate text-right",
                  variable.note ? "text-muted-foreground" : "text-foreground"
                )}
                title={variable.value}
              >
                {variable.value}
              </span>
            </div>
          ))}
        </Field>
      </FieldGroup>
    </FlowSidePanelBase>
  )
}

function extractedVariables(
  config: ReturnType<typeof useAgentStore.getState>["config"]
) {
  const keys = new Set<string>()

  for (const node of config.nodes) {
    if (node.type !== "conversation" || !node.data.extractVariables) {
      continue
    }
    for (const variable of node.data.extractVariables.variables) {
      if (variable.key) {
        keys.add(variable.key)
      }
    }
  }

  for (const tool of config.tools) {
    if (tool.type !== "webhook") {
      continue
    }
    for (const variable of tool.responseVariables) {
      if (variable.name) {
        keys.add(variable.name)
      }
    }
  }

  return [...keys]
}
