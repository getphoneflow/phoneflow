import { PLATFORM_USD_PER_MINUTE } from "@workspace/shared/constants/rates"
import { formatUsdPerMinute, getModel } from "@workspace/shared/models/helpers"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { segmentColor } from "@/components/calls/call-cost-breakdown"
import { env } from "@/lib/env"
import { useAgentStore } from "@/stores/agent"

type Part = {
  key: keyof typeof segmentColor
  name: string
  usdPerMinute: number
  latencyMs: number
}

function formatLatency(latencyMs: number) {
  return `${Math.round(latencyMs).toLocaleString("en-US")} ms`
}

function ProportionBar({
  parts,
  amount,
  format,
}: {
  parts: Part[]
  amount: (part: Part) => number
  format: (amount: number) => string
}) {
  const total = parts.reduce((sum, part) => sum + amount(part), 0)
  if (total <= 0) return null

  return (
    <div className="flex h-1.5 flex-1 overflow-hidden rounded-full">
      {parts.map((part) => {
        const value = amount(part)
        if (value <= 0) return null

        const label = `${part.name}: ${format(value)}`
        return (
          <Tooltip key={part.key}>
            <TooltipTrigger
              render={
                <button
                  aria-label={label}
                  className="cursor-pointer"
                  style={{
                    width: `${(value / total) * 100}%`,
                    backgroundColor: segmentColor[part.key],
                  }}
                />
              }
            />
            <TooltipContent side="top" sideOffset={8}>
              {label}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

export function CostLatency() {
  const config = useAgentStore((state) => state.config)
  const stt = getModel("stt", config.stt.model)
  const llm = getModel("llm", config.llm.model)
  const tts = getModel("tts", config.tts.model)

  const parts: Part[] = [
    {
      key: "stt",
      name: stt?.name ?? "Transcriber",
      usdPerMinute: stt?.usdPerMinute ?? 0,
      latencyMs: stt?.latencyMs ?? 0,
    },
    {
      key: "llm",
      name: llm?.name ?? "Model",
      usdPerMinute: llm?.usdPerMinute ?? 0,
      latencyMs: llm?.latencyMs ?? 0,
    },
    {
      key: "tts",
      name: tts?.name ?? "Voice",
      usdPerMinute: tts?.usdPerMinute ?? 0,
      latencyMs: tts?.latencyMs ?? 0,
    },
    {
      key: "platform",
      name: "Platform",
      usdPerMinute: PLATFORM_USD_PER_MINUTE,
      latencyMs: 0,
    },
  ]

  const cost = parts.reduce((sum, part) => sum + part.usdPerMinute, 0)
  const latency = parts.reduce((sum, part) => sum + part.latencyMs, 0)

  return (
    <div className="flex flex-col gap-3 text-xs">
      {env.IS_CLOUD ? (
        <div className="flex items-center">
          <span className="w-14 text-muted-foreground">Cost:</span>
          <span className="w-21 text-foreground tabular-nums">
            {formatUsdPerMinute(cost)}
          </span>
          <ProportionBar
            parts={parts}
            amount={(part) => part.usdPerMinute}
            format={formatUsdPerMinute}
          />
        </div>
      ) : null}
      <div className="flex items-center">
        <span className="w-14 text-muted-foreground">Latency:</span>
        <span className="w-21 text-foreground tabular-nums">
          {formatLatency(latency)}
        </span>
        <ProportionBar
          parts={parts}
          amount={(part) => part.latencyMs}
          format={formatLatency}
        />
      </div>
    </div>
  )
}
