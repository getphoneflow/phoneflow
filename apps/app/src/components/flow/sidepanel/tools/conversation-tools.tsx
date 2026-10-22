import {
  Braces,
  Keyboard,
  type LucideIcon,
  PhoneForwarded,
  PhoneOff,
  Plus,
  Search,
  Webhook,
} from "lucide-react"
import { useState } from "react"

import type {
  AgentTool,
  EndCallTool,
  ExtractVariablesTool,
  FlowConversationNode,
  IvrNavigationTool,
  TransferCallTool,
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
import { createEndCallDraft, EndCallDialog } from "./end-call-dialog"
import {
  createExtractVariablesDraft,
  ExtractVariablesDialog,
} from "./extract-variables-dialog"
import {
  createIvrNavigationDraft,
  IvrNavigationDialog,
} from "./ivr-navigation-dialog"
import { ToolPickerItem, ToolRow } from "./tool-row"
import {
  createTransferCallDraft,
  TransferCallDialog,
} from "./transfer-call-dialog"
import { createWebhookToolDraft, WebhookToolDialog } from "./webhook-dialog"

type BuiltInKind =
  | "endCall"
  | "extractVariables"
  | "ivrNavigation"
  | "transferCall"

const builtInTools: {
  kind: BuiltInKind
  label: string
  description: string
  icon: LucideIcon
  summary: (node: FlowConversationNode) => string | undefined
}[] = [
  {
    kind: "endCall",
    label: "End call",
    description: "Enable the agent to end the call",
    icon: PhoneOff,
    summary: (node) => node.data.endCall?.description,
  },
  {
    kind: "extractVariables",
    label: "Extract variables",
    description: "Extract variables from the conversation",
    icon: Braces,
    summary: (node) =>
      node.data.extractVariables?.variables
        .map((variable) => `{{${variable.key}}}`)
        .join(", "),
  },
  {
    kind: "ivrNavigation",
    label: "IVR navigation",
    description: "Send keypad tones to navigate a phone menu",
    icon: Keyboard,
    summary: (node) => node.data.ivrNavigation?.description,
  },
  {
    kind: "transferCall",
    label: "Transfer call",
    description: "Forward the call to a phone number",
    icon: PhoneForwarded,
    summary: (node) =>
      node.data.transferCall?.destinations
        .map((destination) => destination.number)
        .join(", "),
  },
]

const additionalTools: {
  type: AgentTool["type"]
  label: string
  icon: LucideIcon
  createDraft: () => AgentTool
}[] = [
  {
    type: "webhook",
    label: "Webhook",
    icon: Webhook,
    createDraft: createWebhookToolDraft,
  },
]

function additionalToolByType(type: AgentTool["type"]) {
  return additionalTools.find((entry) => entry.type === type)
}

function omitBuiltIn(
  data: FlowConversationNode["data"],
  kind: BuiltInKind
): FlowConversationNode["data"] {
  const { [kind]: _removed, ...rest } = data
  return rest
}

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

  const [builtInPickerOpen, setBuiltInPickerOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState("")

  const [endCallDialog, setEndCallDialog] = useState<EndCallTool | null>(null)
  const [extractVariablesDialog, setExtractVariablesDialog] =
    useState<ExtractVariablesTool | null>(null)
  const [ivrNavigationDialog, setIvrNavigationDialog] =
    useState<IvrNavigationTool | null>(null)
  const [transferCallDialog, setTransferCallDialog] =
    useState<TransferCallTool | null>(null)
  const [webhookDialog, setWebhookDialog] = useState<{
    tool: WebhookTool
    mode: "create" | "edit"
  } | null>(null)

  const toolIds = node.data.toolIds ?? []
  const attachedTools = toolIds.map((id) => ({
    id,
    tool: tools.find((entry) => entry.id === id),
  }))
  const needle = query.trim().toLowerCase()
  const availableTools = tools.filter((tool) => {
    if (toolIds.includes(tool.id)) {
      return false
    }
    return needle.length === 0 || tool.name.toLowerCase().includes(needle)
  })

  const attachedBuiltIns = builtInTools.filter((entry) => node.data[entry.kind])
  const availableBuiltIns = builtInTools.filter(
    (entry) => !node.data[entry.kind]
  )

  function updateData(data: FlowConversationNode["data"]) {
    setNode({ ...node, data })
  }

  function openBuiltIn(kind: BuiltInKind) {
    if (kind === "endCall") {
      setEndCallDialog(node.data.endCall ?? createEndCallDraft())
      return
    }
    if (kind === "extractVariables") {
      setExtractVariablesDialog(
        node.data.extractVariables ?? createExtractVariablesDraft()
      )
      return
    }
    if (kind === "ivrNavigation") {
      setIvrNavigationDialog(
        node.data.ivrNavigation ?? createIvrNavigationDraft()
      )
      return
    }
    setTransferCallDialog(node.data.transferCall ?? createTransferCallDraft())
  }

  return (
    <>
      <Field>
        <FieldLabel>Built-in tools</FieldLabel>
        {attachedBuiltIns.map((entry) => (
          <ToolRow
            key={entry.kind}
            icon={entry.icon}
            title={entry.label}
            summary={entry.summary(node)}
            editLabel={`Edit ${entry.label}`}
            removeLabel={`Remove ${entry.label}`}
            readOnly={readOnly}
            onEdit={() => openBuiltIn(entry.kind)}
            onRemove={() => updateData(omitBuiltIn(node.data, entry.kind))}
          />
        ))}
        <Popover open={builtInPickerOpen} onOpenChange={setBuiltInPickerOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={readOnly || availableBuiltIns.length === 0}
              />
            }
          >
            <Plus />
            Add tool
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-(--anchor-width)! gap-1 p-2"
          >
            {availableBuiltIns.map((entry) => (
              <ToolPickerItem
                key={entry.kind}
                icon={entry.icon}
                title={entry.label}
                description={entry.description}
                onSelect={() => {
                  setBuiltInPickerOpen(false)
                  openBuiltIn(entry.kind)
                }}
              />
            ))}
          </PopoverContent>
        </Popover>
      </Field>

      <Field>
        <FieldLabel>Additional tools</FieldLabel>
        {attachedTools.map(({ id, tool }) => {
          const definition = tool ? additionalToolByType(tool.type) : undefined
          return (
            <ToolRow
              key={id}
              icon={definition?.icon ?? additionalTools[0].icon}
              title={tool?.name ?? id}
              summary={tool?.description}
              editLabel="Edit tool"
              removeLabel="Remove from node"
              readOnly={readOnly}
              onEdit={() => {
                if (tool?.type === "webhook") {
                  setWebhookDialog({ tool, mode: "edit" })
                }
              }}
              onRemove={() => removeTool(node.id, id)}
            />
          )
        })}
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
          <PopoverContent
            align="start"
            className="w-(--anchor-width)! gap-3 p-2"
          >
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
              {availableTools.length === 0 ? (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  {tools.length === 0 || needle.length > 0
                    ? "No matching tools"
                    : "All tools are already on this node"}
                </p>
              ) : (
                availableTools.map((tool) => (
                  <ToolPickerItem
                    key={tool.id}
                    icon={
                      additionalToolByType(tool.type)?.icon ??
                      additionalTools[0].icon
                    }
                    title={tool.name}
                    description={tool.description}
                    onSelect={() => {
                      updateData({
                        ...node.data,
                        toolIds: [...toolIds, tool.id],
                      })
                      setPickerOpen(false)
                      setQuery("")
                    }}
                  />
                ))
              )}
            </div>
            {additionalTools.map((entry) => (
              <Button
                key={entry.type}
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setPickerOpen(false)
                  setQuery("")
                  const draft = entry.createDraft()
                  if (draft.type === "webhook") {
                    setWebhookDialog({ tool: draft, mode: "create" })
                  }
                }}
              >
                <Plus />
                New {entry.label.toLowerCase()} tool
              </Button>
            ))}
          </PopoverContent>
        </Popover>
      </Field>

      {endCallDialog ? (
        <EndCallDialog
          open
          tool={endCallDialog}
          readOnly={readOnly}
          onOpenChange={(open) => {
            if (!open) {
              setEndCallDialog(null)
            }
          }}
          onSave={(tool) => {
            updateData({ ...node.data, endCall: tool })
            setEndCallDialog(null)
          }}
        />
      ) : null}

      {extractVariablesDialog ? (
        <ExtractVariablesDialog
          open
          tool={extractVariablesDialog}
          readOnly={readOnly}
          onOpenChange={(open) => {
            if (!open) {
              setExtractVariablesDialog(null)
            }
          }}
          onSave={(tool) => {
            updateData({ ...node.data, extractVariables: tool })
            setExtractVariablesDialog(null)
          }}
        />
      ) : null}

      {ivrNavigationDialog ? (
        <IvrNavigationDialog
          open
          tool={ivrNavigationDialog}
          readOnly={readOnly}
          onOpenChange={(open) => {
            if (!open) {
              setIvrNavigationDialog(null)
            }
          }}
          onSave={(tool) => {
            updateData({ ...node.data, ivrNavigation: tool })
            setIvrNavigationDialog(null)
          }}
        />
      ) : null}

      {transferCallDialog ? (
        <TransferCallDialog
          open
          tool={transferCallDialog}
          readOnly={readOnly}
          onOpenChange={(open) => {
            if (!open) {
              setTransferCallDialog(null)
            }
          }}
          onSave={(tool) => {
            updateData({ ...node.data, transferCall: tool })
            setTransferCallDialog(null)
          }}
        />
      ) : null}

      {webhookDialog ? (
        <WebhookToolDialog
          open
          tool={webhookDialog.tool}
          readOnly={readOnly}
          onOpenChange={(open) => {
            if (!open) {
              setWebhookDialog(null)
            }
          }}
          onSave={(tool) => {
            if (webhookDialog.mode === "create") {
              createTool(tool, node.id)
            } else {
              editTool(tool)
            }
            setWebhookDialog(null)
          }}
        />
      ) : null}
    </>
  )
}
