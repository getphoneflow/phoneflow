import { PauseIcon, PlayIcon, Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import type { BackgroundAudio } from "@workspace/shared/api/agent-config/types"
import {
  BACKGROUND_AUDIO,
  BACKGROUND_AUDIO_IDS,
} from "@workspace/shared/constants/background-audio"
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

type BackgroundAudioOption = {
  id: BackgroundAudio["sound"] | null
  name: string
  source?: string
}

const NONE_OPTION: BackgroundAudioOption = {
  id: null,
  name: "None",
}

const BACKGROUND_AUDIO_OPTIONS: BackgroundAudioOption[] = [
  NONE_OPTION,
  ...BACKGROUND_AUDIO_IDS.map((id) => ({
    id,
    name: BACKGROUND_AUDIO[id].name,
    source: BACKGROUND_AUDIO[id].source,
  })),
]

function filterOption(option: BackgroundAudioOption, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return option.name.toLowerCase().includes(q)
}

export function BackgroundAudioSelect({
  value,
  onValueChange,
  readOnly = false,
}: {
  value?: BackgroundAudio["sound"]
  onValueChange: (value?: BackgroundAudio["sound"]) => void
  readOnly?: boolean
}) {
  const selected =
    BACKGROUND_AUDIO_OPTIONS.find((option) => option.id === (value ?? null)) ??
    NONE_OPTION

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)

  function stop() {
    audioRef.current?.pause()
    audioRef.current = null
    setPlayingId(null)
  }

  function togglePlay(option: BackgroundAudioOption) {
    if (!option.id || !option.source) return

    if (playingId === option.id) {
      stop()
      return
    }

    stop()
    const audio = new Audio(`${env.PUBLIC_S3_URL}/${option.source}`)
    audioRef.current = audio
    audio.addEventListener("ended", stop)
    void audio.play()
    setPlayingId(option.id)
  }

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  return (
    <Field>
      <FieldLabel>Background audio</FieldLabel>
      <Combobox
        autoHighlight
        items={BACKGROUND_AUDIO_OPTIONS}
        value={selected}
        readOnly={readOnly}
        onOpenChange={(open) => {
          if (!open) stop()
        }}
        onValueChange={(next) => {
          if (next) onValueChange(next.id ?? undefined)
        }}
        itemToStringLabel={(option) => option.name}
        isItemEqualToValue={(a, b) => a.id === b.id}
        filter={filterOption}
      >
        <ComboboxTrigger>
          <ComboboxValue>
            {(option: BackgroundAudioOption) => (
              <span className="truncate">{option.name}</span>
            )}
          </ComboboxValue>
        </ComboboxTrigger>
        <ComboboxContent className="w-(--anchor-width) max-w-(--anchor-width) min-w-(--anchor-width)">
          <div className="flex items-center gap-1.5 p-1.5">
            <ComboboxInput
              showTrigger={false}
              placeholder="Search background audio..."
              className="min-w-0 flex-1"
            >
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
            </ComboboxInput>
          </div>
          <ComboboxEmpty>No background audio found</ComboboxEmpty>
          <ComboboxList className="pt-0">
            {(option: BackgroundAudioOption) => (
              <ComboboxItem
                key={option.id ?? "none"}
                value={option}
                className="pl-1"
              >
                {option.source ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 [&_svg]:pointer-events-auto"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      togglePlay(option)
                    }}
                    onPointerDown={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                    }}
                  >
                    {playingId === option.id ? <PauseIcon /> : <PlayIcon />}
                    <span className="sr-only">
                      {playingId === option.id ? "Pause" : "Play"}
                    </span>
                  </Button>
                ) : (
                  <span className="size-6 shrink-0" />
                )}
                <span className="truncate">{option.name}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  )
}
