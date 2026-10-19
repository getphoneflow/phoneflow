import { Plus, Trash2 } from "lucide-react"

import type {
  ExtractVariable,
  FlowConversationNode,
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
import { Textarea } from "@workspace/ui/components/textarea"
import { ConversationTools } from "@/components/flow/tools/conversation-tools"
import { useAgentStore } from "@/stores/agent"
import { FlowSidePanelBase } from "../base"

type ConversationNodePanelProps = {
  node: FlowConversationNode
}

const variableTypes: { value: ExtractVariable["type"]; label: string }[] = [
  { value: "string", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
]

export function ConversationNodePanel({ node }: ConversationNodePanelProps) {
  const readOnly = useAgentStore((state) => state.readOnly)
  const setNode = useAgentStore((state) => state.setNode)

  const extractVariables = node.data.extractVariables ?? []

  function updateVariables(next: ExtractVariable[]) {
    setNode({
      ...node,
      data: {
        ...node.data,
        extractVariables: next.length > 0 ? next : undefined,
      },
    })
  }

  function updateVariable(index: number, changes: Partial<ExtractVariable>) {
    updateVariables(
      extractVariables.map((variable, entryIndex) =>
        entryIndex === index ? { ...variable, ...changes } : variable
      )
    )
  }

  return (
    <FlowSidePanelBase
      title={node.data.isStart ? "Start node" : "Conversation node"}
    >
      <FieldGroup>
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input
            value={node.data.name}
            readOnly={readOnly}
            onChange={(event) =>
              setNode({
                ...node,
                data: { ...node.data, name: event.target.value },
              })
            }
          />
        </Field>
        {node.data.isStart ? (
          <Field>
            <FieldLabel>First speaker</FieldLabel>
            <Tabs
              value={node.data.startSpeaker ?? "agent"}
              onValueChange={(value) => {
                if (value === "agent" || value === "user") {
                  setNode({
                    ...node,
                    data: { ...node.data, startSpeaker: value },
                  })
                }
              }}
            >
              <TabsList>
                <TabsTrigger value="agent" disabled={readOnly}>
                  Agent
                </TabsTrigger>
                <TabsTrigger value="user" disabled={readOnly}>
                  User
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </Field>
        ) : null}
        <Field>
          <Tabs
            value={node.data.instructions.type}
            onValueChange={(value) => {
              if (value === "prompt" || value === "say") {
                setNode({
                  ...node,
                  data: {
                    ...node.data,
                    instructions: { ...node.data.instructions, type: value },
                  },
                })
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="prompt" disabled={readOnly}>
                Prompt
              </TabsTrigger>
              <TabsTrigger value="say" disabled={readOnly}>
                Say
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Textarea
            rows={8}
            value={node.data.instructions.text}
            readOnly={readOnly}
            onChange={(event) =>
              setNode({
                ...node,
                data: {
                  ...node.data,
                  instructions: {
                    ...node.data.instructions,
                    text: event.target.value,
                  },
                },
              })
            }
          />
        </Field>

        <Field>
          <FieldLabel>Extract variables</FieldLabel>
          {extractVariables.map((variable, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-md border border-border p-3"
            >
              <div className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  placeholder="variable_name"
                  value={variable.key}
                  readOnly={readOnly}
                  onChange={(event) =>
                    updateVariable(index, { key: event.target.value })
                  }
                />
                <Select
                  value={variable.type}
                  readOnly={readOnly}
                  onValueChange={(value) =>
                    updateVariable(index, {
                      type: value as ExtractVariable["type"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {
                        variableTypes.find(
                          (type) => type.value === variable.type
                        )?.label
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {variableTypes.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  className="text-destructive!"
                  size="icon-sm"
                  disabled={readOnly}
                  onClick={() =>
                    updateVariables(
                      extractVariables.filter(
                        (_, entryIndex) => entryIndex !== index
                      )
                    )
                  }
                >
                  <Trash2 />
                </Button>
              </div>
              <Textarea
                rows={2}
                placeholder="Describe what to extract (optional)"
                value={variable.description}
                readOnly={readOnly}
                onChange={(event) =>
                  updateVariable(index, {
                    description: event.target.value,
                  })
                }
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={readOnly}
            onClick={() =>
              updateVariables([
                ...extractVariables,
                { key: "", type: "string", description: "" },
              ])
            }
          >
            <Plus />
            Add variable
          </Button>
        </Field>
        <ConversationTools node={node} />
      </FieldGroup>
    </FlowSidePanelBase>
  )
}
