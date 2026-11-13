import { useQuery } from "@tanstack/react-query"
import { Handle, type Node, type NodeProps, Position } from "@xyflow/react"
import { Phone, Play } from "lucide-react"

import type { FlowConversationNode } from "@workspace/shared/api/agent-config/types"
import { knowledgeBaseDocumentsQueryOptions } from "@/components/knowledge-base/documents"
import { useTranslation } from "@/lib/i18n"
import { useAgentStore } from "@/stores/agent"
import { FlowNodeBase } from "./base"

type ConversationNodeType = Node<FlowConversationNode["data"], "conversation">

export function ConversationNode({
  id,
  data,
  selected,
}: NodeProps<ConversationNodeType>) {
  const { t } = useTranslation()
  const isStart = data.isStart
  const tools = useAgentStore((state) => state.config.tools)
  const documentIds = data.documentIds ?? []
  const { data: documents = [] } = useQuery({
    ...knowledgeBaseDocumentsQueryOptions(),
    enabled: documentIds.length > 0,
  })
  const attachedDocuments = documentIds.flatMap((documentId) => {
    const name = documents.find((document) => document.id === documentId)?.name
    return name ? [{ id: documentId, name }] : []
  })
  const toolNames = [
    ...(data.endCall
      ? [t("components.flow.nodes.conversation.tool_names.end_call")]
      : []),
    ...(data.extractVariables
      ? [t("components.flow.nodes.conversation.tool_names.extract_variables")]
      : []),
    ...(data.ivrNavigation
      ? [t("components.flow.nodes.conversation.tool_names.ivr_navigation")]
      : []),
    ...(data.skipTurn
      ? [t("components.flow.nodes.conversation.tool_names.skip_turn")]
      : []),
    ...(data.transferCall
      ? [t("components.flow.nodes.conversation.tool_names.transfer_call")]
      : []),
    ...(data.toolIds ?? []).map(
      (id) => tools.find((tool) => tool.id === id)?.name
    ),
  ].filter(Boolean)

  return (
    <FlowNodeBase id={id} selected={selected}>
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className="size-2! rounded-full! border-2! border-muted-foreground! bg-popover!"
        />
      )}
      <div className="mx-3 my-3 flex items-center space-x-2">
        <span className="flex h-6 w-6 items-center justify-center rounded border border-border">
          {isStart ? (
            <Play className="h-4 w-4 text-green-600" />
          ) : (
            <Phone className="h-4 w-4 text-blue-600" />
          )}
        </span>
        <span className="text-sm font-medium text-foreground">{data.name}</span>
      </div>
      <div className="border-t border-border" />
      <div className="p-3 pb-1 text-xs text-foreground capitalize">
        {t(
          `components.flow.nodes.conversation.instruction_types.${data.instructions.type}`
        )}
      </div>
      <div className="p-3 pt-0">
        <div className="line-clamp-8 whitespace-pre-wrap wrap-break-word text-xs text-muted-foreground">
          {data.instructions.text}
        </div>
      </div>
      {attachedDocuments.length > 0 && (
        <>
          <div className="px-3 text-xs text-foreground">
            {t("components.flow.nodes.conversation.knowledge_base")}
          </div>
          <div className="p-3 pt-1 text-xs text-muted-foreground">
            {attachedDocuments.map((document) => (
              <div key={document.id} className="truncate" title={document.name}>
                {document.name}
              </div>
            ))}
          </div>
        </>
      )}
      {toolNames.length > 0 && (
        <>
          <div className="px-3 text-xs text-foreground">
            {t("components.flow.nodes.conversation.tools")}
          </div>
          <div className="p-3 pt-1 text-xs text-muted-foreground">
            {toolNames.join(", ")}
          </div>
        </>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="size-2! rounded-full! border-2! border-muted-foreground! bg-popover!"
      />
    </FlowNodeBase>
  )
}
