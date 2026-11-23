import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import {
  getModelParameters,
  withSttModel,
} from "@workspace/shared/models/parameters"
import { withEndpointingMode } from "@workspace/shared/models/turn-handling"
import {
  AdvancedFields,
  ConfigSection,
  EnumField,
  ModelParameterField,
  NumberField,
  SwitchField,
} from "@/components/flow/sidepanel/config/fields"
import { ModelSelect } from "@/components/flow/sidepanel/model-select"
import { useTranslation } from "@/lib/i18n"
import { useAgentStore } from "@/stores/agent"

type TurnHandling = AgentConfig["turnHandling"]

export function TranscriberTab() {
  const { t } = useTranslation()
  const readOnly = useAgentStore((state) => state.readOnly)
  const config = useAgentStore((state) => state.config)
  const setConfig = useAgentStore((state) => state.setConfig)

  const stt = config.stt
  const sttParameters = getModelParameters("stt", stt.model)
  const parameters = sttParameters?.parameters
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

      <ModelParameterField
        parameter={parameters?.language}
        value={stt.language}
        label={t("components.flow.sidepanel.config.fields.language.label")}
        description={t(
          "components.flow.sidepanel.config.transcriber_tab.language.description"
        )}
        readOnly={readOnly}
        onChange={(language) => patchStt({ language })}
      />

      <ModelParameterField
        parameter={parameters?.keyterms}
        value={stt.keyterms}
        label={t(
          "components.flow.sidepanel.config.transcriber_tab.keyterms.label"
        )}
        description={t(
          "components.flow.sidepanel.config.transcriber_tab.keyterms.description"
        )}
        readOnly={readOnly}
        onChange={(keyterms) => patchStt({ keyterms })}
      />

      <ModelParameterField
        parameter={parameters?.mode}
        value={stt.mode}
        label={t("components.flow.sidepanel.config.transcriber_tab.mode.label")}
        description={t(
          "components.flow.sidepanel.config.transcriber_tab.mode.description"
        )}
        readOnly={readOnly}
        optionLabel={(value) =>
          t(
            `components.flow.sidepanel.config.transcriber_tab.mode.options.${value}`
          )
        }
        onChange={(mode) => patchStt({ mode })}
      />

      {sttParameters?.turnTaking ? (
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

        <ModelParameterField
          parameter={parameters?.endpointingMs}
          value={stt.endpointingMs}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.silence_timeout.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.silence_timeout.description"
          )}
          readOnly={readOnly}
          onChange={(endpointingMs) => patchStt({ endpointingMs })}
        />

        <ModelParameterField
          parameter={parameters?.vadThreshold}
          value={stt.vadThreshold}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.vad_threshold.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.vad_threshold.description"
          )}
          readOnly={readOnly}
          onChange={(vadThreshold) => patchStt({ vadThreshold })}
        />

        <ModelParameterField
          parameter={parameters?.eagerEotThreshold}
          value={stt.eagerEotThreshold}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.eager_end_of_turn_threshold.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.eager_end_of_turn_threshold.description"
          )}
          readOnly={readOnly}
          onChange={(eagerEotThreshold) => patchStt({ eagerEotThreshold })}
        />

        <ModelParameterField
          parameter={parameters?.eotThreshold}
          value={stt.eotThreshold}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.end_of_turn_threshold.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.end_of_turn_threshold.description"
          )}
          readOnly={readOnly}
          onChange={(eotThreshold) => patchStt({ eotThreshold })}
        />

        <ModelParameterField
          parameter={parameters?.eotTimeoutMs}
          value={stt.eotTimeoutMs}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.end_of_turn_timeout.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.end_of_turn_timeout.description"
          )}
          readOnly={readOnly}
          onChange={(eotTimeoutMs) => patchStt({ eotTimeoutMs })}
        />

        <ModelParameterField
          parameter={parameters?.minTurnSilence}
          value={stt.minTurnSilence}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.min_turn_silence.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.min_turn_silence.description"
          )}
          readOnly={readOnly}
          onChange={(minTurnSilence) => patchStt({ minTurnSilence })}
        />

        <ModelParameterField
          parameter={parameters?.maxTurnSilence}
          value={stt.maxTurnSilence}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.max_turn_silence.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.max_turn_silence.description"
          )}
          readOnly={readOnly}
          onChange={(maxTurnSilence) => patchStt({ maxTurnSilence })}
        />

        <ModelParameterField
          parameter={parameters?.endOfTurnConfidenceThreshold}
          value={stt.endOfTurnConfidenceThreshold}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.end_of_turn_confidence.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.end_of_turn_confidence.description"
          )}
          readOnly={readOnly}
          onChange={(endOfTurnConfidenceThreshold) =>
            patchStt({ endOfTurnConfidenceThreshold })
          }
        />

        <ModelParameterField
          parameter={parameters?.endpointLatencyAdjustmentLevel}
          value={stt.endpointLatencyAdjustmentLevel}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.endpoint_latency_level.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.endpoint_latency_level.description"
          )}
          readOnly={readOnly}
          onChange={(endpointLatencyAdjustmentLevel) =>
            patchStt({ endpointLatencyAdjustmentLevel })
          }
        />

        <ModelParameterField
          parameter={parameters?.minEndOfTurnSilenceWhenConfident}
          value={stt.minEndOfTurnSilenceWhenConfident}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.min_eot_silence_when_confident.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.min_eot_silence_when_confident.description"
          )}
          readOnly={readOnly}
          onChange={(minEndOfTurnSilenceWhenConfident) =>
            patchStt({ minEndOfTurnSilenceWhenConfident })
          }
        />

        <ModelParameterField
          parameter={parameters?.smartTurn}
          value={stt.smartTurn}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.smart_turn.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.smart_turn.description"
          )}
          readOnly={readOnly}
          onChange={(smartTurn) => patchStt({ smartTurn })}
        />

        <ModelParameterField
          parameter={parameters?.smartTurnTimeout}
          value={stt.smartTurnTimeout}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.smart_turn_timeout.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.smart_turn_timeout.description"
          )}
          readOnly={readOnly}
          onChange={(smartTurnTimeout) => patchStt({ smartTurnTimeout })}
        />

        <ModelParameterField
          parameter={parameters?.voiceFocus}
          value={stt.voiceFocus}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.voice_focus.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.voice_focus.description"
          )}
          readOnly={readOnly}
          optionLabel={(value) =>
            t(
              `components.flow.sidepanel.config.transcriber_tab.voice_focus.options.${value.replaceAll("-", "_")}`
            )
          }
          onChange={(voiceFocus) => patchStt({ voiceFocus })}
        />

        <ModelParameterField
          parameter={parameters?.voiceFocusThreshold}
          value={stt.voiceFocusThreshold}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.voice_focus_threshold.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.voice_focus_threshold.description"
          )}
          readOnly={readOnly}
          onChange={(voiceFocusThreshold) => patchStt({ voiceFocusThreshold })}
        />

        <ModelParameterField
          parameter={parameters?.enableVoiceProfile}
          value={stt.enableVoiceProfile}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.voice_profile.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.voice_profile.description"
          )}
          readOnly={readOnly}
          onChange={(enableVoiceProfile) => patchStt({ enableVoiceProfile })}
        />

        <ModelParameterField
          parameter={parameters?.voiceProfileTopN}
          value={stt.voiceProfileTopN}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.voice_profile_top_n.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.voice_profile_top_n.description"
          )}
          readOnly={readOnly}
          onChange={(voiceProfileTopN) => patchStt({ voiceProfileTopN })}
        />

        <ModelParameterField
          parameter={parameters?.diarize}
          value={stt.diarize}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.diarization.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.diarization.description"
          )}
          readOnly={readOnly}
          onChange={(diarize) => patchStt({ diarize })}
        />

        <ModelParameterField
          parameter={parameters?.languageHintsStrict}
          value={stt.languageHintsStrict}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.strict_language.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.strict_language.description"
          )}
          readOnly={readOnly}
          onChange={(languageHintsStrict) => patchStt({ languageHintsStrict })}
        />

        <ModelParameterField
          parameter={parameters?.agentContextCarryover}
          value={stt.agentContextCarryover}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.agent_context_carryover.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.agent_context_carryover.description"
          )}
          readOnly={readOnly}
          onChange={(agentContextCarryover) =>
            patchStt({ agentContextCarryover })
          }
        />

        <ModelParameterField
          parameter={parameters?.mipOptOut}
          value={stt.mipOptOut}
          label={t(
            "components.flow.sidepanel.config.transcriber_tab.mip_opt_out.label"
          )}
          description={t(
            "components.flow.sidepanel.config.transcriber_tab.mip_opt_out.description"
          )}
          readOnly={readOnly}
          onChange={(mipOptOut) => patchStt({ mipOptOut })}
        />
      </AdvancedFields>
    </ConfigSection>
  )
}
