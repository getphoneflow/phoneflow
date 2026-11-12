import { useQuery } from "@tanstack/react-query"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"

import type { FlowConversationNode } from "@workspace/shared/api/agent-config/types"
import type { KnowledgeDocumentListResponse } from "@workspace/shared/api/knowledge-documents/types"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { api } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"
import { useAgentStore } from "@/stores/agent"

type NodeKnowledgeBasesProps = {
  node: FlowConversationNode
}

export function NodeKnowledgeBases({ node }: NodeKnowledgeBasesProps) {
  const { t } = useTranslation()
  const readOnly = useAgentStore((state) => state.readOnly)
  const setNode = useAgentStore((state) => state.setNode)
  const [pickerOpen, setPickerOpen] = useState(false)
  const documentIds = node.data.documentIds ?? []
  const { data: documents = [] } = useQuery({
    queryKey: ["knowledge-documents", "list"],
    queryFn: () =>
      api.get<KnowledgeDocumentListResponse>("/knowledge-documents"),
  })

  const available = documents.filter(
    (document) => !documentIds.includes(document.id)
  )

  function setDocumentIds(next: string[]) {
    setNode({
      ...node,
      data: {
        ...node.data,
        documentIds: next.length ? next : undefined,
      },
    })
  }

  return (
    <Field>
      <FieldLabel>
        {t("components.flow.sidepanel.nodes.conversation.knowledge.label")}
      </FieldLabel>
      <FieldDescription>
        {t(
          "components.flow.sidepanel.nodes.conversation.knowledge.description"
        )}
      </FieldDescription>
      <div className="flex flex-col gap-2">
        {documentIds.map((id) => {
          const document = documents.find((candidate) => candidate.id === id)
          const name =
            document?.name ??
            t(
              "components.flow.sidepanel.nodes.conversation.knowledge.unavailable"
            )
          return (
            <div
              key={id}
              className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={readOnly}
                aria-label={t(
                  "components.flow.sidepanel.nodes.conversation.knowledge.remove",
                  { name }
                )}
                onClick={() =>
                  setDocumentIds(
                    documentIds.filter((current) => current !== id)
                  )
                }
              >
                <Trash2Icon />
              </Button>
            </div>
          )
        })}
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger
            disabled={readOnly}
            render={
              <Button type="button" variant="outline" disabled={readOnly} />
            }
          >
            <PlusIcon />
            {t("components.flow.sidepanel.nodes.conversation.knowledge.add")}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-1">
            {available.length ? (
              available.map((document) => (
                <Button
                  key={document.id}
                  type="button"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    setDocumentIds([...documentIds, document.id])
                    setPickerOpen(false)
                  }}
                >
                  <span className="truncate">{document.name}</span>
                </Button>
              ))
            ) : (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                {t(
                  "components.flow.sidepanel.nodes.conversation.knowledge.empty"
                )}
              </p>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </Field>
  )
}
