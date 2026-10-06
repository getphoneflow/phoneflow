import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import {
  getTtsCapabilities,
  withTtsModel,
  withTtsVoice,
} from "@workspace/shared/models/config"
import { TTS_DEFAULTS } from "@workspace/shared/models/defaults"
import { getModelLanguages, getVoices } from "@workspace/shared/models/helpers"
import { withInterruptionEnabled } from "@workspace/shared/models/turn-handling"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { BackgroundAudioSelect } from "@/components/flow/sidepanel/background-audio-select"
import {
  AdvancedFields,
  ConfigSection,
  EnumField,
  LanguageField,
  MultilineListField,
  NumberField,
  SwitchField,
} from "@/components/flow/sidepanel/config/fields"
import { ModelSelect } from "@/components/flow/sidepanel/model-select"
import { VoiceSelect } from "@/components/flow/sidepanel/voice-select"
import { useAgentStore } from "@/stores/agent"

type TurnHandling = AgentConfig["turnHandling"]
type Interruption = TurnHandling["interruption"]

function ttsValue<K extends keyof typeof TTS_DEFAULTS>(
  tts: AgentConfig["tts"],
  key: K
) {
  const value = tts[key]
  return value === undefined ? TTS_DEFAULTS[key] : value
}

export function VoiceTab() {
  const readOnly = useAgentStore((state) => state.readOnly)
  const config = useAgentStore((state) => state.config)
  const setConfig = useAgentStore((state) => state.setConfig)

  const tts = config.tts
  const fields = getTtsCapabilities(tts.model)?.fields
  const voice = getVoices(tts.model).find((entry) => entry.id === tts.voice)
  const languages = voice?.languages.length
    ? voice.languages
    : getModelLanguages("tts", tts.model)
  const backgroundAudio = config.backgroundAudio
  const turn = config.turnHandling
  const interruption = turn.interruption

  function patchTts(partial: Partial<AgentConfig["tts"]>) {
    setConfig({ ...config, tts: { ...tts, ...partial } })
  }

  function setInterruption(interruption: Interruption) {
    setConfig({
      ...config,
      turnHandling: { ...turn, interruption },
    })
  }

  return (
    <ConfigSection>
      <ModelSelect
        kind="tts"
        label="Model"
        modelId={tts.model}
        readOnly={readOnly}
        onModelChange={(model) => setConfig(withTtsModel(config, model))}
      />

      <VoiceSelect
        modelId={tts.model}
        voiceId={tts.voice}
        readOnly={readOnly}
        onVoiceChange={(voiceId) => setConfig(withTtsVoice(config, voiceId))}
      />

      {fields?.has("language") ? (
        <LanguageField
          languages={languages}
          value={ttsValue(tts, "language")}
          readOnly={readOnly}
          onChange={(language) => patchTts({ language })}
        />
      ) : null}

      {fields?.has("speed") ? (
        <NumberField
          label="Speed"
          description="Speaking rate multiplier. 1 is normal pace"
          value={ttsValue(tts, "speed")}
          min={0.1}
          max={3}
          step={0.05}
          readOnly={readOnly}
          onChange={(speed) => patchTts({ speed })}
        />
      ) : null}

      {fields?.has("latencyMode") ? (
        <EnumField
          label="Latency mode"
          description="Normal is highest quality, low is fastest"
          value={ttsValue(tts, "latencyMode")}
          readOnly={readOnly}
          options={[
            { value: "normal", label: "Normal" },
            { value: "balanced", label: "Balanced" },
            { value: "low", label: "Low" },
          ]}
          onChange={(latencyMode) => patchTts({ latencyMode })}
        />
      ) : null}

      <div className="grid grid-cols-5 items-end gap-4">
        <div className="col-span-3">
          <BackgroundAudioSelect
            value={backgroundAudio?.sound}
            readOnly={readOnly}
            onValueChange={(sound) => {
              if (sound) {
                setConfig({
                  ...config,
                  backgroundAudio: {
                    sound,
                    volume: backgroundAudio?.volume ?? 0.8,
                  },
                })
                return
              }

              const { backgroundAudio: _, ...rest } = config
              setConfig(rest)
            }}
          />
        </div>
        <Field className="col-span-2">
          <FieldLabel>Volume</FieldLabel>
          <Input
            type="number"
            min={0}
            max={1}
            step={0.1}
            disabled={!backgroundAudio || readOnly}
            readOnly={readOnly}
            value={backgroundAudio?.volume ?? 0.8}
            onChange={(event) => {
              if (!backgroundAudio) return
              setConfig({
                ...config,
                backgroundAudio: {
                  ...backgroundAudio,
                  volume: Number(event.target.value),
                },
              })
            }}
          />
        </Field>
      </div>

      <SwitchField
        label="Interruptions"
        description="Stop the agent when the user starts speaking"
        checked={interruption.enabled}
        readOnly={readOnly}
        onCheckedChange={(enabled) =>
          setInterruption(withInterruptionEnabled(enabled))
        }
      />

      <AdvancedFields>
        {interruption.enabled ? (
          <>
            <SwitchField
              label="Discard uninterruptible audio"
              description="Drop buffered audio while the agent is speaking and cannot be interrupted"
              checked={interruption.discardAudioIfUninterruptible}
              readOnly={readOnly}
              onCheckedChange={(discardAudioIfUninterruptible) =>
                setInterruption({
                  ...interruption,
                  discardAudioIfUninterruptible,
                })
              }
            />
            <NumberField
              label="Min interruption duration (ms)"
              description="How long the user must speak before the agent stops talking"
              value={interruption.minDuration}
              min={0}
              step={50}
              readOnly={readOnly}
              onChange={(minDuration) =>
                setInterruption({ ...interruption, minDuration })
              }
            />
            <NumberField
              label="Min interruption words"
              description="How many words the user must say before the agent stops talking"
              value={interruption.minWords}
              min={0}
              step={1}
              readOnly={readOnly}
              onChange={(minWords) =>
                setInterruption({ ...interruption, minWords })
              }
            />
            <NumberField
              label="False interruption timeout (ms)"
              description="How long to wait with no transcript before an interruption counts as false"
              value={interruption.falseInterruptionTimeout}
              min={0}
              step={50}
              readOnly={readOnly}
              onChange={(falseInterruptionTimeout) =>
                setInterruption({ ...interruption, falseInterruptionTimeout })
              }
            />
            <SwitchField
              label="Resume after false interruption"
              description="Resume the agent's speech from where it left off after a false interruption"
              checked={interruption.resumeFalseInterruption}
              readOnly={readOnly}
              onCheckedChange={(resumeFalseInterruption) =>
                setInterruption({ ...interruption, resumeFalseInterruption })
              }
            />
          </>
        ) : null}

        {fields?.has("volume") ? (
          <NumberField
            label="TTS volume"
            description="Loudness adjustment in decibels. 0 leaves the voice unchanged"
            value={ttsValue(tts, "volume")}
            step={0.1}
            readOnly={readOnly}
            onChange={(volume) => patchTts({ volume })}
          />
        ) : null}

        {fields?.has("emotion") ? (
          <MultilineListField
            label="Emotion"
            description="Emotional tone of the speech, one tag per line"
            value={ttsValue(tts, "emotion")}
            readOnly={readOnly}
            placeholder="happiness:0.5"
            onChange={(emotion) => patchTts({ emotion })}
          />
        ) : null}

        {fields?.has("mipOptOut") ? (
          <SwitchField
            label="MIP opt-out"
            description="Opt out of using this audio to improve the provider's models"
            checked={ttsValue(tts, "mipOptOut")}
            readOnly={readOnly}
            onCheckedChange={(mipOptOut) => patchTts({ mipOptOut })}
          />
        ) : null}
      </AdvancedFields>
    </ConfigSection>
  )
}
