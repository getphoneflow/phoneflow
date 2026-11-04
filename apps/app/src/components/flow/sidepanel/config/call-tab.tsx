import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import {
  ConfigSection,
  EnumField,
  NumberField,
} from "@/components/flow/sidepanel/config/fields"
import { useTranslation } from "@/lib/i18n"
import { TIME_ZONES } from "@/lib/time"
import { useAgentStore } from "@/stores/agent"

const TIMEZONE_OPTIONS = TIME_ZONES.map((timezone) => ({
  value: timezone,
  label: timezone,
}))

export function CallTab() {
  const { t } = useTranslation()
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
        label={t(
          "components.flow.sidepanel.config.call_tab.max_call_duration.label"
        )}
        description={t(
          "components.flow.sidepanel.config.call_tab.max_call_duration.description"
        )}
        value={call.maxDurationSec}
        min={1}
        step={1}
        readOnly={readOnly}
        onChange={(maxDurationSec) => patchCall({ maxDurationSec })}
      />

      <NumberField
        label={t(
          "components.flow.sidepanel.config.call_tab.idle_timeout.label"
        )}
        description={t(
          "components.flow.sidepanel.config.call_tab.idle_timeout.description"
        )}
        value={call.idleTimeoutSec}
        min={1}
        step={1}
        readOnly={readOnly}
        onChange={(idleTimeoutSec) => patchCall({ idleTimeoutSec })}
      />

      <NumberField
        label={t(
          "components.flow.sidepanel.config.call_tab.max_idle_messages.label"
        )}
        description={t(
          "components.flow.sidepanel.config.call_tab.max_idle_messages.description"
        )}
        value={call.maxIdleMessages}
        min={1}
        step={1}
        readOnly={readOnly}
        onChange={(maxIdleMessages) => patchCall({ maxIdleMessages })}
      />

      <NumberField
        label={t(
          "components.flow.sidepanel.config.call_tab.silence_timeout.label"
        )}
        description={t(
          "components.flow.sidepanel.config.call_tab.silence_timeout.description"
        )}
        value={call.endOnSilenceSec}
        min={1}
        step={1}
        readOnly={readOnly}
        onChange={(endOnSilenceSec) => patchCall({ endOnSilenceSec })}
      />

      <EnumField
        label={t("components.flow.sidepanel.config.call_tab.timezone.label")}
        description={t(
          "components.flow.sidepanel.config.call_tab.timezone.description",
          {
            date: "{{date}}",
            time: "{{time}}",
            timezone: "{{timezone}}",
          }
        )}
        value={config.timezone}
        options={TIMEZONE_OPTIONS}
        readOnly={readOnly}
        onChange={(timezone) => setConfig({ ...config, timezone })}
      />
    </ConfigSection>
  )
}
