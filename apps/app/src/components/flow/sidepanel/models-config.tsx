import {
  formatUsdPerMinute,
  getModelSections,
  getProviderId,
  pickFirstModel,
} from "@workspace/shared/models/helpers"
import type { ModelKind } from "@workspace/shared/models/types"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { BackgroundAudioPicker } from "@/components/background-audio-picker"
import { env } from "@/lib/env"
import { useAgentStore } from "@/stores/agent"
import { FlowSidePanelBase } from "./base"

function ModelPriceLabel({ usdPerMinute }: { usdPerMinute: number }) {
  if (!env.IS_CLOUD) {
    return null
  }

  return (
    <span className="text-muted-foreground">
      - {formatUsdPerMinute(usdPerMinute)}
    </span>
  )
}

function ProviderModelSelect({
  kind,
  label,
  modelId,
  onModelChange,
  readOnly = false,
}: {
  kind: ModelKind
  label: string
  modelId: string
  onModelChange: (modelId: string) => void
  readOnly?: boolean
}) {
  const providerId = getProviderId(kind, modelId)
  const sections = getModelSections(kind, modelId)
  const section = sections.find((entry) => entry.id === providerId)
  const models = section?.models ?? []
  const selectedModel =
    models.find((model) => model.id === modelId) ?? models[0]

  return (
    <div className="grid grid-cols-5 items-end gap-4">
      <Field className="col-span-2">
        <FieldLabel>{label}</FieldLabel>
        <Select
          value={providerId}
          readOnly={readOnly}
          onValueChange={(nextProviderId) => {
            if (!nextProviderId) return
            const nextModel = pickFirstModel(kind, nextProviderId)
            if (nextModel) {
              onModelChange(nextModel)
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Select ${label} provider`}>
              {section?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sections.map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                {entry.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field className="col-span-3">
        <Select
          value={modelId}
          readOnly={readOnly}
          onValueChange={(nextModelId) => {
            if (nextModelId) onModelChange(nextModelId)
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Select ${label} model`}>
              {selectedModel.name}
              <ModelPriceLabel usdPerMinute={selectedModel.usdPerMinute} />
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
                <ModelPriceLabel usdPerMinute={model.usdPerMinute} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}

export function ModelsConfigPanel() {
  const readOnly = useAgentStore((state) => state.readOnly)
  const config = useAgentStore((state) => state.config)
  const setConfig = useAgentStore((state) => state.setConfig)

  const backgroundAudio = config.backgroundAudio

  return (
    <FlowSidePanelBase title="Models">
      <FieldGroup>
        <ProviderModelSelect
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

        <ProviderModelSelect
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

        <ProviderModelSelect
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
