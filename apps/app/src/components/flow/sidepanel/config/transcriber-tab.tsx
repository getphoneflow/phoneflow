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
import { useTranslation } from "@/lib/i18n"
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
  const { t } = useTranslation()
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
        label={t(
          "components.flow.sidepanel.config.transcriber_tab.model.label"
        )}
        modelId={stt.model}
        readOnly={readOnly}
        onModelChange={(model) => setConfig(withSttModel(config, model))}
      />

      {fields?.has("language") ? (
        <LanguageField
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.language.description"
          )}
          languages={languages}
          value={sttValue(stt, "language")}
          readOnly={readOnly}
          onChange={(language) => patchStt({ language })}
        />
      ) : null}

      {fields?.has("keyterms") ? (
        <StringListField
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.keyterms.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.keyterms.description"
          )}
          value={sttValue(stt, "keyterms")}
          readOnly={readOnly}
          onChange={(keyterms) => patchStt({ keyterms })}
        />
      ) : null}

      {fields?.has("mode") ? (
        <EnumField
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.mode.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.mode.description"
          )}
          value={sttValue(stt, "mode")}
          readOnly={readOnly}
          options={[
            {
              value: "min_latency",
              label: t(
                "components.flow.sidepanel.config.transcriber_tab.mode.options.min_latency"
              ),
            },
            {
              value: "balanced",
              label: t(
                "components.flow.sidepanel.config.transcriber_tab.mode.options.balanced"
              ),
            },
            {
              value: "max_accuracy",
              label: t(
                "components.flow.sidepanel.config.transcriber_tab.mode.options.max_accuracy"
              ),
            },
          ]}
          onChange={(mode) => patchStt({ mode })}
        />
      ) : null}

      {caps?.turnTaking ? (
        <SwitchField
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.intelligent_turn_taking.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.intelligent_turn_taking.description"
          )}
          checked={turn.turnDetection === "stt"}
          readOnly={readOnly}
          onCheckedChange={(enabled) =>
            patchTurn({ turnDetection: enabled ? "stt" : "vad" })
          }
        />
      ) : null}

      <NumberField
        label={t(
          "components.flow.sidepanel.config.transcriber_tab.min_end_of_turn_wait.label"
        )}
        description={t(
          "components.flow.sidepanel.config.transcriber_tab.min_end_of_turn_wait.description"
        )}
        value={endpointing.minDelay}
        min={0}
        step={50}
        readOnly={readOnly}
        onChange={(minDelay) =>
          patchTurn({ endpointing: { ...endpointing, minDelay } })
        }
      />

      <NumberField
        label={t(
          "components.flow.sidepanel.config.transcriber_tab.max_end_of_turn_wait.label"
        )}
        description={t(
          "components.flow.sidepanel.config.transcriber_tab.max_end_of_turn_wait.description"
        )}
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
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.endpointing_mode.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.endpointing_mode.description"
          )}
          value={endpointing.mode}
          readOnly={readOnly}
          options={[
            {
              value: "fixed",
              label: t(
                "components.flow.sidepanel.config.transcriber_tab.endpointing_mode.options.fixed"
              ),
            },
            {
              value: "dynamic",
              label: t(
                "components.flow.sidepanel.config.transcriber_tab.endpointing_mode.options.dynamic"
              ),
            },
          ]}
          onChange={(mode) =>
            patchTurn({
              endpointing: withEndpointingMode(endpointing, mode),
            })
          }
        />

        {endpointing.mode === "dynamic" ? (
          <NumberField
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.endpointing_alpha.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.endpointing_alpha.description"
            )}
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
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.silence_timeout.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.silence_timeout.description"
            )}
            value={sttValue(stt, "endpointingMs")}
            min={0}
            step={50}
            readOnly={readOnly}
            onChange={(endpointingMs) => patchStt({ endpointingMs })}
          />
        ) : null}

        {fields?.has("vadThreshold") ? (
          <NumberField
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.vad_threshold.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.vad_threshold.description"
            )}
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
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.eager_end_of_turn_threshold.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.eager_end_of_turn_threshold.description"
            )}
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
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.end_of_turn_threshold.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.end_of_turn_threshold.description"
            )}
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
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.end_of_turn_timeout.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.end_of_turn_timeout.description"
            )}
            value={sttValue(stt, "eotTimeoutMs")}
            min={1}
            step={50}
            readOnly={readOnly}
            onChange={(eotTimeoutMs) => patchStt({ eotTimeoutMs })}
          />
        ) : null}

        {fields?.has("minTurnSilence") ? (
          <NumberField
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.min_turn_silence.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.min_turn_silence.description"
            )}
            value={sttValue(stt, "minTurnSilence")}
            min={0}
            step={50}
            readOnly={readOnly}
            onChange={(minTurnSilence) => patchStt({ minTurnSilence })}
          />
        ) : null}

        {fields?.has("maxTurnSilence") ? (
          <NumberField
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.max_turn_silence.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.max_turn_silence.description"
            )}
            value={sttValue(stt, "maxTurnSilence")}
            min={0}
            step={50}
            readOnly={readOnly}
            onChange={(maxTurnSilence) => patchStt({ maxTurnSilence })}
          />
        ) : null}

        {fields?.has("endOfTurnConfidenceThreshold") ? (
          <NumberField
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.end_of_turn_confidence.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.end_of_turn_confidence.description"
            )}
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
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.endpoint_latency_level.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.endpoint_latency_level.description"
            )}
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
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.min_eot_silence_when_confident.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.min_eot_silence_when_confident.description"
            )}
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
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.smart_turn.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.smart_turn.description"
            )}
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
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.smart_turn_timeout.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.smart_turn_timeout.description"
            )}
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
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.voice_focus.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.voice_focus.description"
            )}
            value={sttValue(stt, "voiceFocus")}
            readOnly={readOnly}
            options={[
              {
                value: "near-field",
                label: t(
                  "components.flow.sidepanel.config.transcriber_tab.voice_focus.options.near_field"
                ),
              },
              {
                value: "far-field",
                label: t(
                  "components.flow.sidepanel.config.transcriber_tab.voice_focus.options.far_field"
                ),
              },
            ]}
            onChange={(voiceFocus) => patchStt({ voiceFocus })}
          />
        ) : null}

        {fields?.has("voiceFocusThreshold") ? (
          <NumberField
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.voice_focus_threshold.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.voice_focus_threshold.description"
            )}
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
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.voice_profile.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.voice_profile.description"
            )}
            checked={sttValue(stt, "enableVoiceProfile")}
            readOnly={readOnly}
            onCheckedChange={(enableVoiceProfile) =>
              patchStt({ enableVoiceProfile })
            }
          />
        ) : null}

        {fields?.has("voiceProfileTopN") ? (
          <NumberField
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.voice_profile_top_n.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.voice_profile_top_n.description"
            )}
            value={sttValue(stt, "voiceProfileTopN")}
            min={1}
            step={1}
            readOnly={readOnly}
            onChange={(voiceProfileTopN) => patchStt({ voiceProfileTopN })}
          />
        ) : null}

        {fields?.has("diarize") ? (
          <SwitchField
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.diarization.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.diarization.description"
            )}
            checked={sttValue(stt, "diarize")}
            readOnly={readOnly}
            onCheckedChange={(diarize) => patchStt({ diarize })}
          />
        ) : null}

        {fields?.has("languageHintsStrict") ? (
          <SwitchField
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.strict_language.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.strict_language.description"
            )}
            checked={sttValue(stt, "languageHintsStrict")}
            readOnly={readOnly}
            onCheckedChange={(languageHintsStrict) =>
              patchStt({ languageHintsStrict })
            }
          />
        ) : null}

        {fields?.has("agentContextCarryover") ? (
          <SwitchField
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.agent_context_carryover.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.agent_context_carryover.description"
            )}
            checked={sttValue(stt, "agentContextCarryover")}
            readOnly={readOnly}
            onCheckedChange={(agentContextCarryover) =>
              patchStt({ agentContextCarryover })
            }
          />
        ) : null}

        {fields?.has("mipOptOut") ? (
          <SwitchField
            label={t(
              "components.flow.sidepanel.config.transcriber_tab.mip_opt_out.label"
            )}
            description={t(
              "components.flow.sidepanel.config.transcriber_tab.mip_opt_out.description"
            )}
            checked={sttValue(stt, "mipOptOut")}
            readOnly={readOnly}
            onCheckedChange={(mipOptOut) => patchStt({ mipOptOut })}
          />
        ) : null}
      </AdvancedFields>
    </ConfigSection>
  )
}
