import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { ModelTab } from "@/components/flow/sidepanel/config/model-tab"
import { TranscriberTab } from "@/components/flow/sidepanel/config/transcriber-tab"
import { VoiceTab } from "@/components/flow/sidepanel/config/voice-tab"
import { FlowSidePanelBase } from "./base"

export function ConfigPanel() {
  return (
    <FlowSidePanelBase title="Config" contentClassName="flex flex-col p-0">
      <Tabs defaultValue="transcriber" className="min-h-0 flex-1 gap-0">
        <div className="px-4 pt-4">
          <TabsList className="w-full">
            <TabsTrigger value="transcriber">Transcriber</TabsTrigger>
            <TabsTrigger value="model">Model</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
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
      </Tabs>
    </FlowSidePanelBase>
  )
}
