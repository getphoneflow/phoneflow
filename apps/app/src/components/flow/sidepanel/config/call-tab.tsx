import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  ConfigSection,
  EnumField,
  NumberField,
} from "@/components/flow/sidepanel/config/fields"
import { VariableTextField } from "@/components/flow/variables/variable-text-field"
import { useTranslation } from "@/lib/i18n"
import { TIME_ZONES } from "@/lib/time"
import { useAgentStore } from "@/stores/agent"

const TIMEZONE_OPTIONS = TIME_ZONES.map((timezone) => ({
  value: timezone,
  label: timezone,
}))

type VoicemailOption =
  | "off"
  | NonNullable<AgentConfig["voicemailDetection"]>["action"]

export function CallTab() {
  const { t } = useTranslation()
  const readOnly = useAgentStore((state) => state.readOnly)
  const config = useAgentStore((state) => state.config)
  const setConfig = useAgentStore((state) => state.setConfig)

  const call = config.call
  const voicemailDetection = config.voicemailDetection

  function patchCall(partial: Partial<AgentConfig["call"]>) {
    setConfig({
      ...config,
      call: { ...call, ...partial },
    })
  }

  function setVoicemailAction(action: VoicemailOption) {
    if (action === "off") {
      const { voicemailDetection: _, ...rest } = config
      setConfig(rest)
      return
    }

    setConfig({
      ...config,
      voicemailDetection:
        action === "leave_message"
          ? { action, message: "" }
          : { action: "hang_up" },
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

      <EnumField<VoicemailOption>
        label={t(
          "components.flow.sidepanel.config.call_tab.voicemail_detection.label"
        )}
        description={t(
          "components.flow.sidepanel.config.call_tab.voicemail_detection.description"
        )}
        value={voicemailDetection?.action ?? "off"}
        options={[
          {
            value: "off",
            label: t(
              "components.flow.sidepanel.config.call_tab.voicemail_detection.off"
            ),
          },
          {
            value: "hang_up",
            label: t(
              "components.flow.sidepanel.config.call_tab.voicemail_detection.hang_up"
            ),
          },
          {
            value: "leave_message",
            label: t(
              "components.flow.sidepanel.config.call_tab.voicemail_detection.leave_message"
            ),
          },
        ]}
        readOnly={readOnly}
        onChange={setVoicemailAction}
      />

      {voicemailDetection?.action === "leave_message" ? (
        <Field>
          <FieldLabel>
            {t(
              "components.flow.sidepanel.config.call_tab.voicemail_detection.message.label"
            )}
          </FieldLabel>
          <FieldDescription>
            {t(
              "components.flow.sidepanel.config.call_tab.voicemail_detection.message.description"
            )}
          </FieldDescription>
          <VariableTextField
            multiline
            rows={4}
            value={voicemailDetection.message}
            readOnly={readOnly}
            placeholder={t(
              "components.flow.sidepanel.config.call_tab.voicemail_detection.message.placeholder"
            )}
            onChange={(message) =>
              setConfig({
                ...config,
                voicemailDetection: { action: "leave_message", message },
              })
            }
          />
        </Field>
      ) : null}

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
