import { useWavesurfer } from "@wavesurfer/react"
import { DownloadIcon, PauseIcon, PlayIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import Hover from "wavesurfer.js/plugins/hover"
import Timeline from "wavesurfer.js/plugins/timeline"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { env } from "@/lib/env"

const PLAYBACK_RATES = [0.5, 1, 1.5, 2]
const FETCH_PARAMS = { credentials: "include" } as const
const SPLIT_CHANNELS = [
  { waveColor: "#7dd3fc", progressColor: "#38bdf8" },
  { waveColor: "#b796fa", progressColor: "#8b5cf6" },
]

function formatTick(seconds: number) {
  const time = Math.round(seconds)
  if (time < 60) return String(time)
  return `${Math.floor(time / 60)}:${String(time % 60).padStart(2, "0")}`
}

export function CallRecordingPlayer({ callId }: { callId: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [playbackRate, setPlaybackRate] = useState(1)

  const { wavesurfer, isReady, isPlaying } = useWavesurfer({
    container: containerRef,
    url: `${env.API_URL}/api/calls/${callId}/recording`,
    fetchParams: FETCH_PARAMS,
    height: 48,
    minPxPerSec: 50,
    cursorWidth: 2,
    cursorColor: "#ef4444",
    barHeight: 0.8,
    normalize: true,
    dragToSeek: true,
    splitChannels: SPLIT_CHANNELS,
  })

  useEffect(() => {
    if (!wavesurfer) return

    wavesurfer.registerPlugin(
      Timeline.create({
        height: 16,
        timeInterval: 1,
        primaryLabelInterval: 2,
        secondaryLabelInterval: 2,
        style: {
          fontSize: "10px",
          color: "var(--muted-foreground)",
        },
        formatTimeCallback: formatTick,
      })
    )
    wavesurfer.registerPlugin(
      Hover.create({
        lineColor: "var(--muted-foreground)",
        lineWidth: 2,
        labelColor: "var(--foreground)",
        labelBackground: "transparent",
        labelSize: 10,
      })
    )

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return
      event.preventDefault()
      void wavesurfer.playPause()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [wavesurfer])

  function onPlayPause() {
    void wavesurfer?.playPause()
  }

  function onCycleRate() {
    const rate =
      PLAYBACK_RATES[
        (PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length
      ] ?? 1
    setPlaybackRate(rate)
    wavesurfer?.setPlaybackRate(rate, true)
  }

  function onDownload() {
    const src = wavesurfer?.getMediaElement().src
    if (!src) return
    const link = document.createElement("a")
    link.href = src
    link.download = `recording-${callId}.mp4`
    link.click()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center space-x-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          disabled={!isReady}
          onClick={onPlayPause}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={!isReady}
          onClick={onCycleRate}
        >
          {playbackRate}x
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="ml-auto"
          disabled={!isReady}
          onClick={onDownload}
        >
          <DownloadIcon />
          Audio
        </Button>
      </div>
      <div className="relative h-28">
        {!isReady && <Skeleton className="absolute inset-0 z-10" />}
        <div ref={containerRef} className="h-full" />
      </div>
    </div>
  )
}
