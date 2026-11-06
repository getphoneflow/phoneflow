import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  ConfigSection,
  EnumField,
  NumberField,
  SwitchField,
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
  const optOut = config.optOut

  function patchCall(partial: Partial<AgentConfig["call"]>) {
    setConfig({
      ...config,
      call: { ...call, ...partial },
    })
  }

  function setOptOutEnabled(enabled: boolean) {
    if (enabled) {
      setConfig({ ...config, optOut: { action: "end_call" } })
      return
    }

    const { optOut: _, ...rest } = config
    setConfig(rest)
  }

  function setOptOutMessage(value: string) {
    if (!optOut) return

    const { message: _, ...rest } = optOut
    setConfig({
      ...config,
      optOut: value.trim() ? { ...rest, message: value } : rest,
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

      <SwitchField
        label={t("components.flow.sidepanel.config.call_tab.opt_out.label")}
        description={t(
          "components.flow.sidepanel.config.call_tab.opt_out.description"
        )}
        checked={Boolean(optOut)}
        readOnly={readOnly}
        onCheckedChange={setOptOutEnabled}
      />

      {optOut ? (
        <>
          <EnumField
            label={t(
              "components.flow.sidepanel.config.call_tab.opt_out.action.label"
            )}
            description={t(
              "components.flow.sidepanel.config.call_tab.opt_out.action.description"
            )}
            value={optOut.action}
            options={[
              {
                value: "end_call",
                label: t(
                  "components.flow.sidepanel.config.call_tab.opt_out.action.end_call"
                ),
              },
              {
                value: "continue",
                label: t(
                  "components.flow.sidepanel.config.call_tab.opt_out.action.continue"
                ),
              },
            ]}
            readOnly={readOnly}
            onChange={(action) =>
              setConfig({ ...config, optOut: { ...optOut, action } })
            }
          />

          <Field>
            <FieldContent>
              <FieldLabel htmlFor="opt-out-message">
                {t(
                  "components.flow.sidepanel.config.call_tab.opt_out.message.label"
                )}
              </FieldLabel>
              <FieldDescription>
                {t(
                  "components.flow.sidepanel.config.call_tab.opt_out.message.description"
                )}
              </FieldDescription>
            </FieldContent>
            <Textarea
              id="opt-out-message"
              value={optOut.message ?? ""}
              placeholder={t(
                "components.flow.sidepanel.config.call_tab.opt_out.message.placeholder"
              )}
              readOnly={readOnly}
              onChange={(event) => setOptOutMessage(event.target.value)}
            />
          </Field>
        </>
      ) : null}
    </ConfigSection>
  )
}
