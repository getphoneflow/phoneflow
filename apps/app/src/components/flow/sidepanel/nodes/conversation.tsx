import type { FlowConversationNode } from "@workspace/shared/api/agent-config/types"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { NodeKnowledgeBases } from "@/components/flow/sidepanel/nodes/knowledge-bases"
import { ConversationTools } from "@/components/flow/sidepanel/tools/conversation-tools"
import { VariableTextField } from "@/components/flow/variables/variable-text-field"
import { useTranslation } from "@/lib/i18n"
import { useAgentStore } from "@/stores/agent"
import { FlowSidePanelBase } from "../base"

type ConversationNodePanelProps = {
  node: FlowConversationNode
}

export function ConversationNodePanel({ node }: ConversationNodePanelProps) {
  const { t } = useTranslation()
  const readOnly = useAgentStore((state) => state.readOnly)
  const setNode = useAgentStore((state) => state.setNode)

  return (
    <FlowSidePanelBase
      title={
        node.data.isStart
          ? t("components.flow.sidepanel.nodes.conversation.title_start")
          : t("components.flow.sidepanel.nodes.conversation.title")
      }
    >
      <FieldGroup>
        <Field>
          <FieldLabel>
            {t("components.flow.sidepanel.nodes.conversation.name.label")}
          </FieldLabel>
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
            <FieldLabel>
              {t(
                "components.flow.sidepanel.nodes.conversation.first_speaker.label"
              )}
            </FieldLabel>
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
                  {t(
                    "components.flow.sidepanel.nodes.conversation.first_speaker.agent"
                  )}
                </TabsTrigger>
                <TabsTrigger value="user" disabled={readOnly}>
                  {t(
                    "components.flow.sidepanel.nodes.conversation.first_speaker.user"
                  )}
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
                {t(
                  "components.flow.sidepanel.nodes.conversation.instructions.prompt"
                )}
              </TabsTrigger>
              <TabsTrigger value="say" disabled={readOnly}>
                {t(
                  "components.flow.sidepanel.nodes.conversation.instructions.say"
                )}
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

        <NodeKnowledgeBases node={node} />
        <ConversationTools node={node} />
      </FieldGroup>
    </FlowSidePanelBase>
  )
}
