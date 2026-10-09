import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { segmentColor } from "@/components/calls/call-cost-breakdown"
import { CallTab } from "@/components/flow/sidepanel/config/call-tab"
import { CostLatency } from "@/components/flow/sidepanel/config/cost-latency"
import { ModelTab } from "@/components/flow/sidepanel/config/model-tab"
import { TranscriberTab } from "@/components/flow/sidepanel/config/transcriber-tab"
import { VoiceTab } from "@/components/flow/sidepanel/config/voice-tab"
import { FlowSidePanelBase } from "./base"

function ColorDot({ color }: { color: string }) {
  return (
    <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
  )
}

export function ConfigPanel() {
  return (
    <FlowSidePanelBase
      title="Agent config"
      contentClassName="flex flex-col p-0"
    >
      <Tabs defaultValue="transcriber" className="min-h-0 flex-1 gap-0">
        <div className="flex flex-col gap-5 px-4 pt-4">
          <CostLatency />
          <TabsList className="w-full">
            <TabsTrigger value="transcriber">
              <ColorDot color={segmentColor.stt} />
              Transcriber
            </TabsTrigger>
            <TabsTrigger value="model">
              <ColorDot color={segmentColor.llm} />
              Model
            </TabsTrigger>
            <TabsTrigger value="voice">
              <ColorDot color={segmentColor.tts} />
              Voice
            </TabsTrigger>
            <TabsTrigger value="call">Call</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="transcriber" className="overflow-y-auto p-4">
          <TranscriberTab />
        </TabsContent>
        <TabsContent value="model" className="overflow-y-auto p-4">
          <ModelTab />
        </TabsContent>
        <TabsContent value="voice" className="overflow-y-auto p-4">
          <VoiceTab />
        </TabsContent>
        <TabsContent value="call" className="overflow-y-auto p-4">
          <CallTab />
        </TabsContent>
      </Tabs>
    </FlowSidePanelBase>
  )
}
