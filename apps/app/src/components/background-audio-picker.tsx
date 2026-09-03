import { cn } from "cn"
import {
  CheckIcon,
  ChevronsUpDownIcon,
  PauseIcon,
  PlayIcon,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

import type { BackgroundAudio } from "@workspace/shared/api/agent-config/types"
import {
  BACKGROUND_AUDIO,
  BACKGROUND_AUDIO_IDS,
} from "@workspace/shared/constants/background-audio"
import { Button } from "@workspace/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { env } from "@/lib/env"

export function BackgroundAudioPicker({
  value,
  onValueChange,
  readOnly = false,
}: {
  value?: BackgroundAudio["sound"]
  onValueChange: (value?: BackgroundAudio["sound"]) => void
  readOnly?: boolean
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const selected = value ? BACKGROUND_AUDIO[value] : undefined

  function stop() {
    audioRef.current?.pause()
    audioRef.current = null
    setPlayingId(null)
  }

  function togglePlay(id: BackgroundAudio["sound"]) {
    if (playingId === id) {
      stop()
      return
    }

    stop()
    const audio = new Audio(
      `${env.S3_PUBLIC_URL}/${BACKGROUND_AUDIO[id].source}`
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
    <Popover onOpenChange={(open) => !open && stop()}>
      <PopoverTrigger
        disabled={readOnly}
        render={
          <Button
            variant="outline"
            className="w-full justify-between font-normal"
          />
        }
      >
        <span className="truncate">{selected?.name ?? "None"}</span>
        <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) gap-0 p-1">
        <AudioOption
          name="None"
          isSelected={!value}
          onSelect={() => onValueChange()}
        />
        {BACKGROUND_AUDIO_IDS.map((id) => (
          <AudioOption
            key={id}
            name={BACKGROUND_AUDIO[id].name}
            isSelected={value === id}
            isPlaying={playingId === id}
            onSelect={() => onValueChange(id)}
            onPlay={() => togglePlay(id)}
          />
        ))}
      </PopoverContent>
    </Popover>
  )
}

function AudioOption({
  name,
  isSelected,
  isPlaying = false,
  onSelect,
  onPlay,
}: {
  name: string
  isSelected: boolean
  isPlaying?: boolean
  onSelect: () => void
  onPlay?: () => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-sm hover:bg-accent">
      {onPlay && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="ml-1"
          onClick={onPlay}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
          <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
        </Button>
      )}
      <button
        type="button"
        className={cn(
          "flex flex-1 items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
          !onPlay && "pl-8"
        )}
        onClick={onSelect}
      >
        <span className="flex-1 truncate">{name}</span>
        <CheckIcon
          className={cn(
            "size-4 shrink-0",
            isSelected ? "opacity-100" : "opacity-0"
          )}
        />
      </button>
    </div>
  )
}
