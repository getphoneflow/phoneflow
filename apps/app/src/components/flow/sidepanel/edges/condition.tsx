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
  operatorLabelKeys,
  operatorNeedsValue,
} from "@/components/flow/edges/condition-format"
import { VariableSelect } from "@/components/flow/variables/variable-select"
import { VariableTextField } from "@/components/flow/variables/variable-text-field"
import { useTranslation } from "@/lib/i18n"
import { useAgentStore } from "@/stores/agent"
import { FlowSidePanelBase } from "../base"

type EdgePanelProps = {
  edge: FlowEdgeConfig
}

const conditionTypes: { value: FlowEdgeCondition["type"]; label: string }[] = [
  {
    value: "prompt",
    label: "components.flow.sidepanel.edges.condition.condition_type.prompt",
  },
  {
    value: "expression",
    label:
      "components.flow.sidepanel.edges.condition.condition_type.expression",
  },
  {
    value: "always",
    label: "components.flow.sidepanel.edges.condition.condition_type.always",
  },
]

const matchOptions: { value: "all" | "any"; label: string }[] = [
  {
    value: "all",
    label: "components.flow.sidepanel.edges.condition.match.all",
  },
  {
    value: "any",
    label: "components.flow.sidepanel.edges.condition.match.any",
  },
]

const operatorOptions = Object.entries(operatorLabelKeys) as [
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
  const { t } = useTranslation()
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
    <FlowSidePanelBase
      title={t("components.flow.sidepanel.edges.condition.title")}
    >
      <FieldGroup>
        <Field>
          <FieldLabel>
            {t(
              "components.flow.sidepanel.edges.condition.condition_type.label"
            )}
          </FieldLabel>
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
                  {t(type.label)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </Field>

        {condition.type === "prompt" && (
          <Field>
            <FieldLabel>
              {t("components.flow.sidepanel.edges.condition.prompt.label")}
            </FieldLabel>
            <VariableTextField
              placeholder={t(
                "components.flow.sidepanel.edges.condition.prompt.placeholder"
              )}
              value={condition.prompt}
              readOnly={readOnly}
              onChange={(prompt) => updateCondition({ ...condition, prompt })}
            />
          </Field>
        )}

        {condition.type === "expression" && (
          <Field>
            <FieldLabel>
              {t("components.flow.sidepanel.edges.condition.match.label")}
            </FieldLabel>
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
                    {t(option.label)}
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
                      <SelectValue>
                        {t(operatorLabelKeys[row.operator])}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {operatorOptions.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {t(label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {operatorNeedsValue(row.operator) && (
                    <Input
                      className="flex-1"
                      placeholder={t(
                        "components.flow.sidepanel.edges.condition.value.placeholder"
                      )}
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
              {t("components.flow.sidepanel.edges.condition.add_condition")}
            </Button>
          </Field>
        )}

        {condition.type === "always" && (
          <p className="text-sm text-muted-foreground">
            {t("components.flow.sidepanel.edges.condition.always_description")}
          </p>
        )}
      </FieldGroup>
    </FlowSidePanelBase>
  )
}
