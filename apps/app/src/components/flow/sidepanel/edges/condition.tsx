import { Plus, Trash2 } from "lucide-react"

import type {
  ExpressionCondition,
  ExpressionOperator,
  FlowEdgeCondition,
  FlowEdgeConfig,
} from "@workspace/shared/api/agent-config/types"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import {
  operatorLabels,
  operatorNeedsValue,
} from "@/components/flow/edges/condition-format"
import { VariableSelect } from "@/components/flow/variables/variable-select"
import { VariableTextField } from "@/components/flow/variables/variable-text-field"
import { useAgentStore } from "@/stores/agent"
import { FlowSidePanelBase } from "../base"

type EdgePanelProps = {
  edge: FlowEdgeConfig
}

const conditionTypes: { value: FlowEdgeCondition["type"]; label: string }[] = [
  { value: "prompt", label: "Prompt" },
  { value: "expression", label: "Expression" },
  { value: "always", label: "Always" },
]

const matchOptions: { value: "all" | "any"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "any", label: "Any" },
]

const operatorOptions = Object.entries(operatorLabels) as [
  ExpressionOperator,
  string,
][]

function emptyRow(): ExpressionCondition {
  return { variable: "", operator: "equals", value: "" }
}

function defaultCondition(type: FlowEdgeCondition["type"]): FlowEdgeCondition {
  switch (type) {
    case "prompt":
      return { type: "prompt", prompt: "Transition condition" }
    case "expression":
      return { type: "expression", match: "all", conditions: [emptyRow()] }
    case "always":
      return { type: "always" }
  }
}

export function EdgePanel({ edge }: EdgePanelProps) {
  const readOnly = useAgentStore((state) => state.readOnly)
  const setEdge = useAgentStore((state) => state.setEdge)

  const condition = edge.data.condition

  function updateCondition(next: FlowEdgeCondition) {
    setEdge({ ...edge, data: { ...edge.data, condition: next } })
  }

  function updateRows(rows: ExpressionCondition[]) {
    if (condition.type !== "expression") {
      return
    }
    updateCondition({ ...condition, conditions: rows })
  }

  function updateRow(index: number, changes: Partial<ExpressionCondition>) {
    if (condition.type !== "expression") {
      return
    }
    updateRows(
      condition.conditions.map((row, entryIndex) =>
        entryIndex === index ? { ...row, ...changes } : row
      )
    )
  }

  return (
    <FlowSidePanelBase title="Edge">
      <FieldGroup>
        <Field>
          <FieldLabel>Condition type</FieldLabel>
          <Tabs
            value={condition.type}
            onValueChange={(value) =>
              updateCondition(
                defaultCondition(value as FlowEdgeCondition["type"])
              )
            }
          >
            <TabsList>
              {conditionTypes.map((type) => (
                <TabsTrigger
                  key={type.value}
                  value={type.value}
                  disabled={readOnly}
                >
                  {type.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </Field>

        {condition.type === "prompt" && (
          <Field>
            <FieldLabel>Prompt</FieldLabel>
            <VariableTextField
              placeholder="Transition condition"
              value={condition.prompt}
              readOnly={readOnly}
              onChange={(prompt) => updateCondition({ ...condition, prompt })}
            />
          </Field>
        )}

        {condition.type === "expression" && (
          <Field>
            <FieldLabel>Match</FieldLabel>
            <Tabs
              value={condition.match}
              onValueChange={(value) => {
                if (value === "all" || value === "any") {
                  updateCondition({ ...condition, match: value })
                }
              }}
            >
              <TabsList>
                {matchOptions.map((option) => (
                  <TabsTrigger
                    key={option.value}
                    value={option.value}
                    disabled={readOnly}
                  >
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {condition.conditions.map((row, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 rounded-md border border-border p-3"
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <VariableSelect
                      value={row.variable}
                      readOnly={readOnly}
                      onChange={(variable) => updateRow(index, { variable })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    className="text-destructive!"
                    size="icon-sm"
                    disabled={readOnly}
                    onClick={() =>
                      updateRows(
                        condition.conditions.filter(
                          (_, entryIndex) => entryIndex !== index
                        )
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={row.operator}
                    readOnly={readOnly}
                    onValueChange={(value) =>
                      updateRow(index, {
                        operator: value as ExpressionOperator,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>{operatorLabels[row.operator]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {operatorOptions.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {operatorNeedsValue(row.operator) && (
                    <Input
                      className="flex-1"
                      placeholder="value"
                      value={row.value ?? ""}
                      readOnly={readOnly}
                      onChange={(event) =>
                        updateRow(index, { value: event.target.value })
                      }
                    />
                  )}
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              disabled={readOnly}
              onClick={() => updateRows([...condition.conditions, emptyRow()])}
            >
              <Plus />
              Add condition
            </Button>
          </Field>
        )}

        {condition.type === "always" && (
          <p className="text-sm text-muted-foreground">
            Always transitions to the next node on the following turn. Must be
            the only transition on the node.
          </p>
        )}
      </FieldGroup>
    </FlowSidePanelBase>
  )
}
