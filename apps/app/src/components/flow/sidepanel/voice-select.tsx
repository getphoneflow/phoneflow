import { PauseIcon, PlayIcon, Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { getVoices, type Voice } from "@workspace/shared/models/helpers"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@workspace/ui/components/combobox"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { InputGroupAddon } from "@workspace/ui/components/input-group"
import { env } from "@/lib/env"

function VoiceRow({ voice }: { voice: Voice }) {
  return (
    <div className="min-w-0 flex-1 text-left">
      <div className="truncate font-medium">{voice.name}</div>
      {voice.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {voice.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="h-4 px-1.5 text-[10px] capitalize"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function filterVoice(voice: Voice, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true

  return `${voice.name} ${voice.gender} ${voice.description} ${voice.tags.join(" ")} ${voice.languages.join(" ")}`
    .toLowerCase()
    .includes(q)
}

export function VoiceSelect({
  modelId,
  voiceId,
  onVoiceChange,
  readOnly = false,
}: {
  modelId: string
  voiceId: string
  onVoiceChange: (voiceId: string) => void
  readOnly?: boolean
}) {
  const voices = getVoices(modelId)
  const providerSlug = modelId.slice(0, modelId.indexOf("/"))
  const selectedVoice =
    voices.find((voice) => voice.id === voiceId) ?? voices[0]

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)

  function stop() {
    audioRef.current?.pause()
    audioRef.current = null
    setPlayingId(null)
  }

  function togglePlay(id: string) {
    if (playingId === id) {
      stop()
      return
    }

    stop()
    const audio = new Audio(
      `${env.PUBLIC_S3_URL}/voices/${providerSlug}/${id}.mp3`
    )
    audioRef.current = audio
    audio.addEventListener("ended", stop)
    void audio.play()
    setPlayingId(id)
  }

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  return (
    <Field>
      <FieldLabel>Voice</FieldLabel>
      <Combobox
        autoHighlight
        items={voices}
        value={selectedVoice}
        readOnly={readOnly || voices.length === 0}
        onOpenChange={(open) => {
          if (!open) stop()
        }}
        onValueChange={(next) => {
          if (next) onVoiceChange(next.id)
        }}
        itemToStringLabel={(voice) => voice?.name ?? ""}
        isItemEqualToValue={(a, b) => a?.id === b?.id}
        filter={filterVoice}
      >
        <ComboboxTrigger className="pl-3">
          <ComboboxValue>
            {(value: Voice) => <VoiceRow voice={value} />}
          </ComboboxValue>
        </ComboboxTrigger>
        <ComboboxContent className="w-(--anchor-width) max-w-(--anchor-width) min-w-(--anchor-width)">
          <div className="flex items-center gap-1.5 p-1.5">
            <ComboboxInput
              showTrigger={false}
              placeholder="Search voices..."
              className="min-w-0 flex-1"
            >
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
            </ComboboxInput>
          </div>
          <ComboboxEmpty>No voices found</ComboboxEmpty>
          <ComboboxList className="pt-0">
            {(voice: Voice) => (
              <ComboboxItem
                key={voice.id}
                value={voice}
                className="items-start py-2 pl-1"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="mt-0.5 shrink-0 [&_svg]:pointer-events-auto"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    togglePlay(voice.id)
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                  }}
                >
                  {playingId === voice.id ? <PauseIcon /> : <PlayIcon />}
                  <span className="sr-only">
                    {playingId === voice.id ? "Pause" : "Play"}
                  </span>
                </Button>
                <VoiceRow voice={voice} />
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  )
}
