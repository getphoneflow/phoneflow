import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { BackgroundAudioPicker } from "@/components/background-audio-picker"
import { ModelSelect } from "@/components/flow/sidepanel/model-select"
import { useAgentStore } from "@/stores/agent"
import { FlowSidePanelBase } from "./base"

export function ModelsConfigPanel() {
  const readOnly = useAgentStore((state) => state.readOnly)
  const config = useAgentStore((state) => state.config)
  const setConfig = useAgentStore((state) => state.setConfig)

  const backgroundAudio = config.backgroundAudio

  return (
    <FlowSidePanelBase title="Models">
      <FieldGroup>
        <ModelSelect
          kind="stt"
          label="STT"
          modelId={config.stt.model}
          readOnly={readOnly}
          onModelChange={(model) => {
            setConfig({
              ...config,
              stt: { ...config.stt, model },
            })
          }}
        />

        <ModelSelect
          kind="llm"
          label="LLM"
          modelId={config.llm.model}
          readOnly={readOnly}
          onModelChange={(model) => {
            setConfig({
              ...config,
              llm: { ...config.llm, model },
            })
          }}
        />

        <ModelSelect
          kind="tts"
          label="TTS"
          modelId={config.tts.model}
          readOnly={readOnly}
          onModelChange={(model) => {
            setConfig({
              ...config,
              tts: {
                ...config.tts,
                model,
              },
            })
          }}
        />

        <Field>
          <FieldLabel>Voice</FieldLabel>
          <Input
            value={config.tts.voice}
            readOnly={readOnly}
            placeholder="Provider voice ID"
            onChange={(event) =>
              setConfig({
                ...config,
                tts: { ...config.tts, voice: event.target.value },
              })
            }
          />
        </Field>

        <div className="grid grid-cols-5 items-end gap-4">
          <Field className="col-span-3">
            <FieldLabel>Background audio</FieldLabel>
            <BackgroundAudioPicker
              value={backgroundAudio?.sound}
              readOnly={readOnly}
              onValueChange={(sound) =>
                setConfig({
                  ...config,
                  backgroundAudio: sound
                    ? { sound, volume: backgroundAudio?.volume ?? 0.8 }
                    : undefined,
                })
              }
            />
          </Field>

          {backgroundAudio && (
            <Field className="col-span-2">
              <FieldLabel>Volume</FieldLabel>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.1}
                readOnly={readOnly}
                value={backgroundAudio.volume}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    backgroundAudio: {
                      ...backgroundAudio,
                      volume: Number(event.target.value),
                    },
                  })
                }
              />
            </Field>
          )}
        </div>
      </FieldGroup>
    </FlowSidePanelBase>
  )
}
