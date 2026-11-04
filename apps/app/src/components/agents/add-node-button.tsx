import { useReactFlow } from "@xyflow/react"
import { Phone, PhoneOff, Play, Plus } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  FOCUS_ZOOM,
  getNextNodePosition,
  SIDE_PANEL_OFFSET_PX,
} from "@/components/flow/node-position"
import { useTranslation } from "@/lib/i18n"
import { useAgentStore } from "@/stores/agent"

export function AddNodeButton() {
  const readOnly = useAgentStore((state) => state.readOnly)
  const addNode = useAgentStore((state) => state.addNode)
  const nodes = useAgentStore((state) => state.config.nodes)
  const flow = useReactFlow()
  const { t } = useTranslation()

  function handleAdd(type: "start" | "conversation" | "end") {
    const id = `${type}-${Date.now()}`
    const position = getNextNodePosition(nodes)

    if (type === "start") {
      addNode({
        id,
        type: "conversation",
        position,
        data: {
          name: "Start Conversation",
          isStart: true,
          startSpeaker: "agent",
          instructions: {
            type: "prompt",
            text: "Greet the user and ask how you can help",
          },
        },
      })
    } else if (type === "conversation") {
      addNode({
        id,
        type: "conversation",
        position,
        data: {
          name: "New Conversation",
          instructions: {
            type: "prompt",
            text: "Enter instructions here",
          },
        },
      })
    } else if (type === "end") {
      addNode({
        id,
        type: "end",
        position,
        data: { name: "End Call" },
      })
    }

    flow.setCenter(position.x + SIDE_PANEL_OFFSET_PX, position.y, {
      zoom: FOCUS_ZOOM,
      duration: 800,
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger disabled={readOnly} className="w-fit">
        <Button disabled={readOnly}>
          <Plus />
          {t("components.agents.add_node_button.trigger")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 font-medium" sideOffset={8}>
        <DropdownMenuItem onClick={() => handleAdd("start")}>
          <span className="flex h-6 w-6 items-center justify-center rounded border border-border">
            <Play className="h-4 w-4 text-green-600" />
          </span>
          {t("components.agents.add_node_button.start")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAdd("conversation")}>
          <span className="flex h-6 w-6 items-center justify-center rounded border border-border">
            <Phone className="h-4 w-4 text-blue-600" />
          </span>
          {t("components.agents.add_node_button.conversation")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAdd("end")}>
          <span className="flex h-6 w-6 items-center justify-center rounded border border-border">
            <PhoneOff className="h-4 w-4 text-red-600" />
          </span>
          {t("components.agents.add_node_button.end")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
