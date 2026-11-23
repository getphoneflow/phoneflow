import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import {
  getModelParameters,
  withLlmModel,
} from "@workspace/shared/models/parameters"
import { withPreemptiveEnabled } from "@workspace/shared/models/turn-handling"
import {
  AdvancedFields,
  ConfigSection,
  ModelParameterField,
  NumberField,
  SwitchField,
} from "@/components/flow/sidepanel/config/fields"
import { ModelSelect } from "@/components/flow/sidepanel/model-select"
import { useTranslation } from "@/lib/i18n"
import { useAgentStore } from "@/stores/agent"

type TurnHandling = AgentConfig["turnHandling"]
type Preemptive = TurnHandling["preemptiveGeneration"]

export function ModelTab() {
  const { t } = useTranslation()
  const readOnly = useAgentStore((state) => state.readOnly)
  const config = useAgentStore((state) => state.config)
  const setConfig = useAgentStore((state) => state.setConfig)

  const llm = config.llm
  const parameters = getModelParameters("llm", llm.model)?.parameters
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

      <ModelParameterField
        parameter={parameters?.temperature}
        value={llm.temperature}
        label={t(
          "components.flow.sidepanel.config.model_tab.temperature.label"
        )}
        description={t(
          "components.flow.sidepanel.config.model_tab.temperature.description"
        )}
        readOnly={readOnly}
        onChange={(temperature) => patchLlm({ temperature })}
      />

      <ModelParameterField
        parameter={parameters?.reasoningEffort}
        value={llm.reasoningEffort}
        label={t(
          "components.flow.sidepanel.config.model_tab.reasoning_effort.label"
        )}
        description={t(
          "components.flow.sidepanel.config.model_tab.reasoning_effort.description"
        )}
        readOnly={readOnly}
        optionLabel={(value) =>
          t(
            `components.flow.sidepanel.config.model_tab.reasoning_effort.options.${value}`
          )
        }
        onChange={(reasoningEffort) => patchLlm({ reasoningEffort })}
      />

      <AdvancedFields>
        <ModelParameterField
          parameter={parameters?.maxTokens}
          value={llm.maxTokens}
          label={t(
            "components.flow.sidepanel.config.model_tab.max_tokens.label"
          )}
          description={t(
            "components.flow.sidepanel.config.model_tab.max_tokens.description"
          )}
          readOnly={readOnly}
          onChange={(maxTokens) => patchLlm({ maxTokens })}
        />

        <ModelParameterField
          parameter={parameters?.toolChoice}
          value={llm.toolChoice}
          label={t(
            "components.flow.sidepanel.config.model_tab.tool_choice.label"
          )}
          description={t(
            "components.flow.sidepanel.config.model_tab.tool_choice.description"
          )}
          readOnly={readOnly}
          optionLabel={(value) =>
            t(
              `components.flow.sidepanel.config.model_tab.tool_choice.options.${value}`
            )
          }
          onChange={(toolChoice) => patchLlm({ toolChoice })}
        />

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
