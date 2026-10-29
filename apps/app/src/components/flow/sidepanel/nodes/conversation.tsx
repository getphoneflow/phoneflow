import type { FlowConversationNode } from "@workspace/shared/api/agent-config/types"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { ConversationTools } from "@/components/flow/sidepanel/tools/conversation-tools"
import { VariableTextField } from "@/components/flow/variables/variable-text-field"
import { useAgentStore } from "@/stores/agent"
import { FlowSidePanelBase } from "../base"

type ConversationNodePanelProps = {
  node: FlowConversationNode
}

export function ConversationNodePanel({ node }: ConversationNodePanelProps) {
  const readOnly = useAgentStore((state) => state.readOnly)
  const setNode = useAgentStore((state) => state.setNode)

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

          <VariableTextField
            multiline
            rows={8}
            value={node.data.instructions.text}
            readOnly={readOnly}
            onChange={(text) =>
              setNode({
                ...node,
                data: {
                  ...node.data,
                  instructions: {
                    ...node.data.instructions,
                    text,
                  },
                },
              })
            }
          />
        </Field>

        <ConversationTools node={node} />
      </FieldGroup>
    </FlowSidePanelBase>
  )
}
