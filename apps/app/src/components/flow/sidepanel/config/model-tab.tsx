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
        label="Model"
        modelId={llm.model}
        readOnly={readOnly}
        onModelChange={(model) => setConfig(withLlmModel(config, model))}
      />

      {fields?.has("temperature") ? (
        <NumberField
          label="Temperature"
          description="Controls randomness. Lower is more deterministic, higher is more creative"
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
          label="Reasoning effort"
          description="How long the model thinks before it answers"
          value={llmValue(llm, "reasoningEffort")}
          readOnly={readOnly}
          options={[
            { value: "none", label: "None" },
            { value: "minimal", label: "Minimal" },
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
          onChange={(reasoningEffort) => patchLlm({ reasoningEffort })}
        />
      ) : null}

      <AdvancedFields>
        {fields?.has("maxTokens") ? (
          <NumberField
            label="Max tokens"
            description="Max tokens the agent can generate each turn"
            value={llmValue(llm, "maxTokens")}
            min={1}
            step={1}
            readOnly={readOnly}
            onChange={(maxTokens) => patchLlm({ maxTokens })}
          />
        ) : null}

        {fields?.has("toolChoice") ? (
          <EnumField
            label="Tool choice"
            description="Auto decides, None disables tools, Required always calls one"
            value={llmValue(llm, "toolChoice")}
            readOnly={readOnly}
            options={[
              { value: "auto", label: "Auto" },
              { value: "none", label: "None" },
              { value: "required", label: "Required" },
            ]}
            onChange={(toolChoice) => patchLlm({ toolChoice })}
          />
        ) : null}

        <SwitchField
          label="Preemptive generation"
          description="Start generating a reply before the user's turn is confirmed"
          checked={preemptive.enabled}
          readOnly={readOnly}
          onCheckedChange={(enabled) =>
            setPreemptive(withPreemptiveEnabled(enabled))
          }
        />

        {preemptive.enabled ? (
          <>
            <SwitchField
              label="Preemptive TTS"
              description="Also synthesize speech before the turn is confirmed"
              checked={preemptive.preemptiveTts}
              readOnly={readOnly}
              onCheckedChange={(preemptiveTts) =>
                setPreemptive({ ...preemptive, preemptiveTts })
              }
            />
            <NumberField
              label="Max speech duration (ms)"
              description="Skip early generation if the user has already been speaking longer than this"
              value={preemptive.maxSpeechDuration}
              min={1}
              step={100}
              readOnly={readOnly}
              onChange={(maxSpeechDuration) =>
                setPreemptive({ ...preemptive, maxSpeechDuration })
              }
            />
            <NumberField
              label="Max retries"
              description="Maximum early-generation attempts for one turn"
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
