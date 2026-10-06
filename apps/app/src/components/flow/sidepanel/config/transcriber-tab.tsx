import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import {
  getSttCapabilities,
  withSttModel,
} from "@workspace/shared/models/config"
import { STT_DEFAULTS } from "@workspace/shared/models/defaults"
import { getModelLanguages } from "@workspace/shared/models/helpers"
import { withEndpointingMode } from "@workspace/shared/models/turn-handling"
import {
  AdvancedFields,
  ConfigSection,
  EnumField,
  LanguageField,
  NumberField,
  StringListField,
  SwitchField,
} from "@/components/flow/sidepanel/config/fields"
import { ModelSelect } from "@/components/flow/sidepanel/model-select"
import { useAgentStore } from "@/stores/agent"

type TurnHandling = AgentConfig["turnHandling"]

function sttValue<K extends keyof typeof STT_DEFAULTS>(
  stt: AgentConfig["stt"],
  key: K
) {
  const value = stt[key]
  return value === undefined ? STT_DEFAULTS[key] : value
}

export function TranscriberTab() {
  const readOnly = useAgentStore((state) => state.readOnly)
  const config = useAgentStore((state) => state.config)
  const setConfig = useAgentStore((state) => state.setConfig)

  const stt = config.stt
  const caps = getSttCapabilities(stt.model)
  const fields = caps?.fields
  const languages = getModelLanguages("stt", stt.model)
  const turn = config.turnHandling
  const endpointing = turn.endpointing

  function patchStt(partial: Partial<AgentConfig["stt"]>) {
    setConfig({ ...config, stt: { ...stt, ...partial } })
  }

  function patchTurn(partial: Partial<TurnHandling>) {
    setConfig({
      ...config,
      turnHandling: { ...turn, ...partial },
    })
  }

  return (
    <ConfigSection>
      <ModelSelect
        kind="stt"
        label="Model"
        modelId={stt.model}
        readOnly={readOnly}
        onModelChange={(model) => setConfig(withSttModel(config, model))}
      />

      {fields?.has("language") ? (
        <LanguageField
          description="Recognition is optimized for this language"
          languages={languages}
          value={sttValue(stt, "language")}
          readOnly={readOnly}
          onChange={(language) => patchStt({ language })}
        />
      ) : null}

      {fields?.has("keyterms") ? (
        <StringListField
          label="Keyterms"
          description="Boost recognition of names, jargon, and product terms"
          value={sttValue(stt, "keyterms")}
          readOnly={readOnly}
          onChange={(keyterms) => patchStt({ keyterms })}
        />
      ) : null}

      {fields?.has("mode") ? (
        <EnumField
          label="Mode"
          description="Balance between speed and accuracy"
          value={sttValue(stt, "mode")}
          readOnly={readOnly}
          options={[
            { value: "min_latency", label: "Min latency" },
            { value: "balanced", label: "Balanced" },
            { value: "max_accuracy", label: "Max accuracy" },
          ]}
          onChange={(mode) => patchStt({ mode })}
        />
      ) : null}

      {caps?.turnTaking ? (
        <SwitchField
          label="Intelligent turn taking"
          description="On, the transcriber decides when the user finished. Off, the agent waits a fixed silence delay instead"
          checked={turn.turnDetection === "stt"}
          readOnly={readOnly}
          onCheckedChange={(enabled) =>
            patchTurn({ turnDetection: enabled ? "stt" : "vad" })
          }
        />
      ) : null}

      <NumberField
        label="Min end of turn wait (ms)"
        description="How long to wait after the user stops speaking before the agent can respond"
        value={endpointing.minDelay}
        min={0}
        step={50}
        readOnly={readOnly}
        onChange={(minDelay) =>
          patchTurn({ endpointing: { ...endpointing, minDelay } })
        }
      />

      <NumberField
        label="Max end of turn wait (ms)"
        description="Longest the agent waits after the user stops speaking before ending the turn"
        value={endpointing.maxDelay}
        min={0}
        step={50}
        readOnly={readOnly}
        onChange={(maxDelay) =>
          patchTurn({ endpointing: { ...endpointing, maxDelay } })
        }
      />

      <AdvancedFields>
        <EnumField
          label="Endpointing mode"
          description="Fixed uses the min and max delays, dynamic adapts within that range from pause statistics"
          value={endpointing.mode}
          readOnly={readOnly}
          options={[
            { value: "fixed", label: "Fixed" },
            { value: "dynamic", label: "Dynamic" },
          ]}
          onChange={(mode) =>
            patchTurn({
              endpointing: withEndpointingMode(endpointing, mode),
            })
          }
        />

        {endpointing.mode === "dynamic" ? (
          <NumberField
            label="Endpointing alpha"
            description="Weight of past pauses in dynamic endpointing. Higher adapts more slowly"
            value={endpointing.alpha}
            min={0}
            max={1}
            step={0.05}
            readOnly={readOnly}
            onChange={(alpha) =>
              patchTurn({ endpointing: { ...endpointing, alpha } })
            }
          />
        ) : null}

        {fields?.has("endpointingMs") ? (
          <NumberField
            label="Silence timeout (ms)"
            description="Silence before this transcriber treats the turn as complete"
            value={sttValue(stt, "endpointingMs")}
            min={0}
            step={50}
            readOnly={readOnly}
            onChange={(endpointingMs) => patchStt({ endpointingMs })}
          />
        ) : null}

        {fields?.has("vadThreshold") ? (
          <NumberField
            label="VAD threshold"
            description="How sensitive voice detection is. Higher ignores more background noise"
            value={sttValue(stt, "vadThreshold")}
            min={0}
            max={1}
            step={0.05}
            readOnly={readOnly}
            onChange={(vadThreshold) => patchStt({ vadThreshold })}
          />
        ) : null}

        {fields?.has("eagerEotThreshold") ? (
          <NumberField
            label="Eager end-of-turn threshold"
            description="Confidence required to signal an early end of turn"
            value={sttValue(stt, "eagerEotThreshold")}
            min={0.3}
            max={0.9}
            step={0.05}
            readOnly={readOnly}
            onChange={(eagerEotThreshold) => patchStt({ eagerEotThreshold })}
          />
        ) : null}

        {fields?.has("eotThreshold") ? (
          <NumberField
            label="End-of-turn threshold"
            description="Confidence needed before the transcriber closes the user's turn"
            value={sttValue(stt, "eotThreshold")}
            min={0.5}
            max={0.9}
            step={0.05}
            readOnly={readOnly}
            onChange={(eotThreshold) => patchStt({ eotThreshold })}
          />
        ) : null}

        {fields?.has("eotTimeoutMs") ? (
          <NumberField
            label="End-of-turn timeout (ms)"
            description="Silence that ends the turn even if confidence is still low"
            value={sttValue(stt, "eotTimeoutMs")}
            min={1}
            step={50}
            readOnly={readOnly}
            onChange={(eotTimeoutMs) => patchStt({ eotTimeoutMs })}
          />
        ) : null}

        {fields?.has("minTurnSilence") ? (
          <NumberField
            label="Min turn silence (ms)"
            description="Silence before the model checks whether the turn has ended"
            value={sttValue(stt, "minTurnSilence")}
            min={0}
            step={50}
            readOnly={readOnly}
            onChange={(minTurnSilence) => patchStt({ minTurnSilence })}
          />
        ) : null}

        {fields?.has("maxTurnSilence") ? (
          <NumberField
            label="Max turn silence (ms)"
            description="Silence that forces the turn to end"
            value={sttValue(stt, "maxTurnSilence")}
            min={0}
            step={50}
            readOnly={readOnly}
            onChange={(maxTurnSilence) => patchStt({ maxTurnSilence })}
          />
        ) : null}

        {fields?.has("endOfTurnConfidenceThreshold") ? (
          <NumberField
            label="End-of-turn confidence"
            description="How sure the transcriber must be that the user is done"
            value={sttValue(stt, "endOfTurnConfidenceThreshold")}
            min={0}
            max={1}
            step={0.05}
            readOnly={readOnly}
            onChange={(endOfTurnConfidenceThreshold) =>
              patchStt({ endOfTurnConfidenceThreshold })
            }
          />
        ) : null}

        {fields?.has("endpointLatencyAdjustmentLevel") ? (
          <NumberField
            label="Endpoint latency level"
            description="0 is default semantic endpointing, 3 is most aggressive"
            value={sttValue(stt, "endpointLatencyAdjustmentLevel")}
            min={0}
            max={3}
            step={1}
            readOnly={readOnly}
            onChange={(endpointLatencyAdjustmentLevel) =>
              patchStt({ endpointLatencyAdjustmentLevel })
            }
          />
        ) : null}

        {fields?.has("minEndOfTurnSilenceWhenConfident") ? (
          <NumberField
            label="Min EOT silence when confident (ms)"
            description="Shortest silence required to end a turn when the model is already confident"
            value={sttValue(stt, "minEndOfTurnSilenceWhenConfident")}
            min={0}
            step={50}
            readOnly={readOnly}
            onChange={(minEndOfTurnSilenceWhenConfident) =>
              patchStt({ minEndOfTurnSilenceWhenConfident })
            }
          />
        ) : null}

        {fields?.has("smartTurn") ? (
          <NumberField
            label="Smart turn"
            description="Confidence required before smart turn detection ends the user's turn"
            value={sttValue(stt, "smartTurn")}
            min={0}
            max={1}
            step={0.05}
            readOnly={readOnly}
            onChange={(smartTurn) => patchStt({ smartTurn })}
          />
        ) : null}

        {fields?.has("smartTurnTimeout") ? (
          <NumberField
            label="Smart turn timeout (ms)"
            description="How long smart turn detection waits before ending the turn"
            value={sttValue(stt, "smartTurnTimeout")}
            min={1}
            max={5000}
            step={50}
            readOnly={readOnly}
            onChange={(smartTurnTimeout) => patchStt({ smartTurnTimeout })}
          />
        ) : null}

        {fields?.has("voiceFocus") ? (
          <EnumField
            label="Voice focus"
            description="Tune recognition for a close or distant microphone"
            value={sttValue(stt, "voiceFocus")}
            readOnly={readOnly}
            options={[
              { value: "near-field", label: "Near field" },
              { value: "far-field", label: "Far field" },
            ]}
            onChange={(voiceFocus) => patchStt({ voiceFocus })}
          />
        ) : null}

        {fields?.has("voiceFocusThreshold") ? (
          <NumberField
            label="Voice focus threshold"
            description="How aggressively background audio is suppressed. Higher is stronger"
            value={sttValue(stt, "voiceFocusThreshold")}
            min={0}
            max={1}
            step={0.05}
            readOnly={readOnly}
            onChange={(voiceFocusThreshold) =>
              patchStt({ voiceFocusThreshold })
            }
          />
        ) : null}

        {fields?.has("enableVoiceProfile") ? (
          <SwitchField
            label="Voice profile"
            description="Bias recognition toward a saved speaker profile"
            checked={sttValue(stt, "enableVoiceProfile")}
            readOnly={readOnly}
            onCheckedChange={(enableVoiceProfile) =>
              patchStt({ enableVoiceProfile })
            }
          />
        ) : null}

        {fields?.has("voiceProfileTopN") ? (
          <NumberField
            label="Voice profile top N"
            description="How many speaker profiles to match against"
            value={sttValue(stt, "voiceProfileTopN")}
            min={1}
            step={1}
            readOnly={readOnly}
            onChange={(voiceProfileTopN) => patchStt({ voiceProfileTopN })}
          />
        ) : null}

        {fields?.has("diarize") ? (
          <SwitchField
            label="Diarization"
            description="Label distinct speakers in the transcript"
            checked={sttValue(stt, "diarize")}
            readOnly={readOnly}
            onCheckedChange={(diarize) => patchStt({ diarize })}
          />
        ) : null}

        {fields?.has("languageHintsStrict") ? (
          <SwitchField
            label="Strict language"
            description="Prefer transcription in the selected language"
            checked={sttValue(stt, "languageHintsStrict")}
            readOnly={readOnly}
            onCheckedChange={(languageHintsStrict) =>
              patchStt({ languageHintsStrict })
            }
          />
        ) : null}

        {fields?.has("agentContextCarryover") ? (
          <SwitchField
            label="Agent context carryover"
            description="Bias the next transcription with what the agent just said"
            checked={sttValue(stt, "agentContextCarryover")}
            readOnly={readOnly}
            onCheckedChange={(agentContextCarryover) =>
              patchStt({ agentContextCarryover })
            }
          />
        ) : null}

        {fields?.has("mipOptOut") ? (
          <SwitchField
            label="MIP opt-out"
            description="Opt out of using this audio to improve the provider's models"
            checked={sttValue(stt, "mipOptOut")}
            readOnly={readOnly}
            onCheckedChange={(mipOptOut) => patchStt({ mipOptOut })}
          />
        ) : null}
      </AdvancedFields>
    </ConfigSection>
  )
}
