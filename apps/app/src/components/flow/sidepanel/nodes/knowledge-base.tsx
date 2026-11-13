import { useQuery } from "@tanstack/react-query"
import { FileText, Plus, Search, Trash2 } from "lucide-react"
import { useState } from "react"

import type { FlowConversationNode } from "@workspace/shared/api/agent-config/types"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { AddKnowledgeBaseDocumentForm } from "@/components/knowledge-base/add-document-form"
import { knowledgeBaseDocumentsQueryOptions } from "@/components/knowledge-base/documents"
import { useCheckPermission } from "@/lib/auth/permissions"
import { useTranslation } from "@/lib/i18n"
import { useAgentStore } from "@/stores/agent"

type NodeKnowledgeBaseProps = {
  node: FlowConversationNode
}

function DocumentPickerItem({
  name,
  onSelect,
}: {
  name: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
      onClick={onSelect}
    >
      <FileText className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate">{name}</span>
    </button>
  )
}

export function NodeKnowledgeBase({ node }: NodeKnowledgeBaseProps) {
  const { t } = useTranslation()
  const readOnly = useAgentStore((state) => state.readOnly)
  const canCreate = useCheckPermission({ knowledgeBase: ["create"] })
  const setNode = useAgentStore((state) => state.setNode)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [query, setQuery] = useState("")
  const documentIds = node.data.documentIds ?? []
  const { data: documents = [] } = useQuery(
    knowledgeBaseDocumentsQueryOptions()
  )

  const needle = query.trim().toLowerCase()
  const ready = documents.filter((document) => document.status === "ready")
  const available = ready.filter((document) => {
    if (documentIds.includes(document.id)) return false
    if (!needle) return true
    return document.name.toLowerCase().includes(needle)
  })

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
            className="flex items-center rounded-md border border-border p-2"
          >
            <FileText className="mr-2 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1 truncate text-sm">{name}</div>
            <Button
              type="button"
              variant="ghost"
              className="text-destructive!"
              size="icon-sm"
              disabled={readOnly}
              aria-label={t(
                "components.flow.sidepanel.nodes.conversation.knowledge.remove",
                { name }
              )}
              onClick={() =>
                setDocumentIds(documentIds.filter((current) => current !== id))
              }
            >
              <Trash2 />
            </Button>
          </div>
        )
      })}
      <Popover
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open)
          if (!open) setQuery("")
        }}
      >
        <PopoverTrigger
          disabled={readOnly}
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={readOnly}
            />
          }
        >
          <Plus />
          {t("components.flow.sidepanel.nodes.conversation.knowledge.add")}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width)! gap-3 p-2">
          <InputGroup>
            <InputGroupInput
              placeholder={t(
                "components.flow.sidepanel.nodes.conversation.knowledge.search"
              )}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
            {available.length === 0 ? (
              <p className="px-1 py-2 text-sm text-muted-foreground">
                {ready.length === 0 || needle.length > 0
                  ? t(
                      "components.flow.sidepanel.nodes.conversation.knowledge.no_matches"
                    )
                  : t(
                      "components.flow.sidepanel.nodes.conversation.knowledge.all_attached"
                    )}
              </p>
            ) : (
              available.map((document) => (
                <DocumentPickerItem
                  key={document.id}
                  name={document.name}
                  onSelect={() => {
                    setDocumentIds([...documentIds, document.id])
                    setPickerOpen(false)
                    setQuery("")
                  }}
                />
              ))
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canCreate}
            onClick={() => {
              setPickerOpen(false)
              setQuery("")
              setCreateOpen(true)
            }}
          >
            <Plus />
            {t(
              "components.flow.sidepanel.nodes.conversation.knowledge.new_document"
            )}
          </Button>
        </PopoverContent>
      </Popover>
      <AddKnowledgeBaseDocumentForm
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </Field>
  )
}
