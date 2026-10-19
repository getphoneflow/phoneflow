import { PencilLine, Plus, Search, Trash2, Webhook } from "lucide-react"
import { useState } from "react"

import type {
  FlowConversationNode,
  WebhookTool,
} from "@workspace/shared/api/agent-config/types"
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
import { useAgentStore } from "@/stores/agent"
import { createWebhookToolDraft, WebhookToolDialog } from "./webhook-dialog"

type ConversationToolsProps = {
  node: FlowConversationNode
}

export function ConversationTools({ node }: ConversationToolsProps) {
  const readOnly = useAgentStore((state) => state.readOnly)
  const tools = useAgentStore((state) => state.config.tools)
  const setNode = useAgentStore((state) => state.setNode)
  const createTool = useAgentStore((state) => state.createTool)
  const editTool = useAgentStore((state) => state.editTool)
  const removeTool = useAgentStore((state) => state.removeTool)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [webhookDialog, setWebhookDialog] = useState<{
    open: boolean
    tool: WebhookTool
    mode: "create" | "edit"
  }>(() => ({
    open: false,
    tool: createWebhookToolDraft(),
    mode: "create",
  }))

  const toolIds = node.data.toolIds ?? []
  const attached = toolIds.map((id) => ({
    id,
    tool: tools.find((entry) => entry.id === id),
  }))
  const available = tools.filter((tool) => {
    if (toolIds.includes(tool.id)) {
      return false
    }
    const needle = query.trim().toLowerCase()
    return needle.length === 0 || tool.name.toLowerCase().includes(needle)
  })

  function setToolIds(next: string[]) {
    setNode({
      ...node,
      data: {
        ...node.data,
        toolIds: next.length > 0 ? next : undefined,
      },
    })
  }

  return (
    <Field>
      <FieldLabel>Tools</FieldLabel>
      {attached.map(({ id, tool }) => (
        <div
          key={id}
          className="flex items-center rounded-md border border-border p-2"
        >
          {tool?.type === "webhook" && (
            <Webhook className="mr-2 size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0 flex-1 truncate text-sm">{tool?.name}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit tool"
            onClick={() => {
              if (tool?.type === "webhook") {
                setWebhookDialog({ open: true, tool, mode: "edit" })
              }
            }}
          >
            <PencilLine />
          </Button>
          <Button
            variant="ghost"
            className="text-destructive!"
            size="icon-sm"
            aria-label="Remove from node"
            disabled={readOnly}
            onClick={() => removeTool(node.id, id)}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Popover
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open)
          if (!open) {
            setQuery("")
          }
        }}
      >
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={readOnly}
            />
          }
        >
          <Plus />
          Add tool
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width)! gap-3 p-2">
          <InputGroup>
            <InputGroupInput
              placeholder="Search tools..."
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
                {tools.length === 0 || query.trim().length > 0
                  ? "No matching tools"
                  : "All tools are already on this node"}
              </p>
            ) : (
              available.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setToolIds([...toolIds, tool.id])
                    setPickerOpen(false)
                    setQuery("")
                  }}
                >
                  {tool.type === "webhook" && (
                    <Webhook className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{tool.name}</span>
                </button>
              ))
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setPickerOpen(false)
              setQuery("")
              setWebhookDialog({
                open: true,
                tool: createWebhookToolDraft(),
                mode: "create",
              })
            }}
          >
            <Plus />
            New webhook tool
          </Button>
        </PopoverContent>
      </Popover>
      <WebhookToolDialog
        open={webhookDialog.open}
        tool={webhookDialog.tool}
        mode={webhookDialog.mode}
        readOnly={readOnly}
        onOpenChange={(open) =>
          setWebhookDialog((current) => ({ ...current, open }))
        }
        onSave={(tool) => {
          if (webhookDialog.mode === "create") {
            createTool(tool, node.id)
          } else {
            editTool(tool)
          }
          setWebhookDialog((current) => ({ ...current, open: false }))
        }}
      />
    </Field>
  )
}
