import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import {
  getLlmCapabilities,
  withLlmModel,
} from "@workspace/shared/models/config"
import { LLM_DEFAULTS } from "@workspace/shared/models/defaults"
import { withPreemptiveEnabled } from "@workspace/shared/models/turn-handling"
import {
  AdvancedFields,
  ConfigSection,
  EnumField,
  NumberField,
  SwitchField,
} from "@/components/flow/sidepanel/config/fields"
import { ModelSelect } from "@/components/flow/sidepanel/model-select"
import { useTranslation } from "@/lib/i18n"
import { useAgentStore } from "@/stores/agent"

type TurnHandling = AgentConfig["turnHandling"]
type Preemptive = TurnHandling["preemptiveGeneration"]

function llmValue<K extends keyof typeof LLM_DEFAULTS>(
  llm: AgentConfig["llm"],
  key: K
) {
  const value = llm[key]
  return value === undefined ? LLM_DEFAULTS[key] : value
}

export function ModelTab() {
  const { t } = useTranslation()
  const readOnly = useAgentStore((state) => state.readOnly)
  const config = useAgentStore((state) => state.config)
  const setConfig = useAgentStore((state) => state.setConfig)

  const llm = config.llm
  const fields = getLlmCapabilities(llm.model)?.fields
  const turn = config.turnHandling
  const preemptive = turn.preemptiveGeneration

  function patchLlm(partial: Partial<AgentConfig["llm"]>) {
    setConfig({ ...config, llm: { ...llm, ...partial } })
  }

  function setPreemptive(preemptiveGeneration: Preemptive) {
    setConfig({
      ...config,
      turnHandling: { ...turn, preemptiveGeneration },
    })
  }

  return (
    <ConfigSection>
      <ModelSelect
        kind="llm"
        label={t("components.flow.sidepanel.config.model_tab.model.label")}
        modelId={llm.model}
        readOnly={readOnly}
        onModelChange={(model) => setConfig(withLlmModel(config, model))}
      />

      {fields?.has("temperature") ? (
        <NumberField
          label={t(
            "components.flow.sidepanel.config.model_tab.temperature.label"
          )}
          description={t(
            "components.flow.sidepanel.config.model_tab.temperature.description"
          )}
          value={llmValue(llm, "temperature")}
          min={0}
          max={2}
          step={0.1}
          readOnly={readOnly}
          onChange={(temperature) => patchLlm({ temperature })}
        />
      ) : null}

      {fields?.has("reasoningEffort") ? (
        <EnumField
          label={t(
            "components.flow.sidepanel.config.model_tab.reasoning_effort.label"
          )}
          description={t(
            "components.flow.sidepanel.config.model_tab.reasoning_effort.description"
          )}
          value={llmValue(llm, "reasoningEffort")}
          readOnly={readOnly}
          options={[
            {
              value: "none",
              label: t(
                "components.flow.sidepanel.config.model_tab.reasoning_effort.options.none"
              ),
            },
            {
              value: "minimal",
              label: t(
                "components.flow.sidepanel.config.model_tab.reasoning_effort.options.minimal"
              ),
            },
            {
              value: "low",
              label: t(
                "components.flow.sidepanel.config.model_tab.reasoning_effort.options.low"
              ),
            },
            {
              value: "medium",
              label: t(
                "components.flow.sidepanel.config.model_tab.reasoning_effort.options.medium"
              ),
            },
            {
              value: "high",
              label: t(
                "components.flow.sidepanel.config.model_tab.reasoning_effort.options.high"
              ),
            },
          ]}
          onChange={(reasoningEffort) => patchLlm({ reasoningEffort })}
        />
      ) : null}

      <AdvancedFields>
        {fields?.has("maxTokens") ? (
          <NumberField
            label={t(
              "components.flow.sidepanel.config.model_tab.max_tokens.label"
            )}
            description={t(
              "components.flow.sidepanel.config.model_tab.max_tokens.description"
            )}
            value={llmValue(llm, "maxTokens")}
            min={1}
            step={1}
            readOnly={readOnly}
            onChange={(maxTokens) => patchLlm({ maxTokens })}
          />
        ) : null}

        {fields?.has("toolChoice") ? (
          <EnumField
            label={t(
              "components.flow.sidepanel.config.model_tab.tool_choice.label"
            )}
            description={t(
              "components.flow.sidepanel.config.model_tab.tool_choice.description"
            )}
            value={llmValue(llm, "toolChoice")}
            readOnly={readOnly}
            options={[
              {
                value: "auto",
                label: t(
                  "components.flow.sidepanel.config.model_tab.tool_choice.options.auto"
                ),
              },
              {
                value: "none",
                label: t(
                  "components.flow.sidepanel.config.model_tab.tool_choice.options.none"
                ),
              },
              {
                value: "required",
                label: t(
                  "components.flow.sidepanel.config.model_tab.tool_choice.options.required"
                ),
              },
            ]}
            onChange={(toolChoice) => patchLlm({ toolChoice })}
          />
        ) : null}

        <SwitchField
          label={t(
            "components.flow.sidepanel.config.model_tab.preemptive_generation.label"
          )}
          description={t(
            "components.flow.sidepanel.config.model_tab.preemptive_generation.description"
          )}
          checked={preemptive.enabled}
          readOnly={readOnly}
          onCheckedChange={(enabled) =>
            setPreemptive(withPreemptiveEnabled(enabled))
          }
        />

        {preemptive.enabled ? (
          <>
            <SwitchField
              label={t(
                "components.flow.sidepanel.config.model_tab.preemptive_tts.label"
              )}
              description={t(
                "components.flow.sidepanel.config.model_tab.preemptive_tts.description"
              )}
              checked={preemptive.preemptiveTts}
              readOnly={readOnly}
              onCheckedChange={(preemptiveTts) =>
                setPreemptive({ ...preemptive, preemptiveTts })
              }
            />
            <NumberField
              label={t(
                "components.flow.sidepanel.config.model_tab.max_speech_duration.label"
              )}
              description={t(
                "components.flow.sidepanel.config.model_tab.max_speech_duration.description"
              )}
              value={preemptive.maxSpeechDuration}
              min={1}
              step={100}
              readOnly={readOnly}
              onChange={(maxSpeechDuration) =>
                setPreemptive({ ...preemptive, maxSpeechDuration })
              }
            />
            <NumberField
              label={t(
                "components.flow.sidepanel.config.model_tab.max_retries.label"
              )}
              description={t(
                "components.flow.sidepanel.config.model_tab.max_retries.description"
              )}
              value={preemptive.maxRetries}
              min={1}
              step={1}
              readOnly={readOnly}
              onChange={(maxRetries) =>
                setPreemptive({ ...preemptive, maxRetries })
              }
            />
          </>
        ) : null}
      </AdvancedFields>
    </ConfigSection>
  )
}
