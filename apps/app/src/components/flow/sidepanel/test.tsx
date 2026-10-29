import { useState } from "react"

import type { CallVariableValues } from "@workspace/shared/api/calls/types"
import {
  callVariableRecord,
  VariableValuesFields,
} from "@/components/variable-values-fields"
import { VoiceAgentClient } from "@/components/voice-agent-client"
import { VoiceAgentTranscript } from "@/components/voice-agent-transcript"
import { useAgentStore } from "@/stores/agent"
import { FlowSidePanelBase } from "./base"

export function TestPanel() {
  const agent = useAgentStore((state) => state.agent)
  const dynamicVariables = useAgentStore(
    (state) => state.config.dynamicVariables
  )
  const activeVersionId = useAgentStore((state) => state.activeVersionId)
  const [values, setValues] = useState<CallVariableValues>({})

  return (
    <FlowSidePanelBase title="Test agent" contentClassName="p-0">
      <VoiceAgentClient
        agentId={agent.id}
        agentVersionId={activeVersionId ?? undefined}
        variableValues={callVariableRecord(dynamicVariables, values)}
        preCallContent={
          <VariableValuesFields
            className="mb-4"
            variables={dynamicVariables}
            values={values}
            onValueChange={(key, value) =>
              setValues((current) => ({ ...current, [key]: value }))
            }
          />
        }
      >
        <VoiceAgentTranscript />
      </VoiceAgentClient>
    </FlowSidePanelBase>
  )
}
