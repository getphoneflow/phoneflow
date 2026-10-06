import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import {
  ConfigSection,
  NumberField,
} from "@/components/flow/sidepanel/config/fields"
import { useAgentStore } from "@/stores/agent"

export function CallTab() {
  const readOnly = useAgentStore((state) => state.readOnly)
  const config = useAgentStore((state) => state.config)
  const setConfig = useAgentStore((state) => state.setConfig)

  const call = config.call

  function patchCall(partial: Partial<AgentConfig["call"]>) {
    setConfig({
      ...config,
      call: { ...call, ...partial },
    })
  }

  return (
    <ConfigSection>
      <NumberField
        label="Max call duration (s)"
        description="Hang up when the call reaches this duration"
        value={call.maxDurationSec}
        min={1}
        step={1}
        readOnly={readOnly}
        onChange={(maxDurationSec) => patchCall({ maxDurationSec })}
      />

      <NumberField
        label="Idle timeout (s)"
        description="How long to wait after the user stays silent before the agent checks if they are still there"
        value={call.idleTimeoutSec}
        min={1}
        step={1}
        readOnly={readOnly}
        onChange={(idleTimeoutSec) => patchCall({ idleTimeoutSec })}
      />

      <NumberField
        label="Max idle messages"
        description="Maximum times the agent can check if the user is still there during the call"
        value={call.maxIdleMessages}
        min={1}
        step={1}
        readOnly={readOnly}
        onChange={(maxIdleMessages) => patchCall({ maxIdleMessages })}
      />

      <NumberField
        label="Silence timeout (s)"
        description="End the call if the user stays silent for more than this duration"
        value={call.endOnSilenceSec}
        min={1}
        step={1}
        readOnly={readOnly}
        onChange={(endOnSilenceSec) => patchCall({ endOnSilenceSec })}
      />
    </ConfigSection>
  )
}
