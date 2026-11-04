import { PLATFORM_USD_PER_MINUTE } from "@workspace/shared/constants/rates"
import { formatUsdPerMinute, getModel } from "@workspace/shared/models/helpers"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { segmentColor } from "@/components/calls/call-cost-breakdown"
import { env } from "@/lib/env"
import { useTranslation } from "@/lib/i18n"
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
  const { t } = useTranslation()
  const total = parts.reduce((sum, part) => sum + amount(part), 0)
  if (total <= 0) return null

  return (
    <div className="flex h-1.5 overflow-hidden rounded-full">
      {parts.map((part) => {
        const value = amount(part)
        if (value <= 0) return null

        const label = t("components.flow.sidepanel.config.cost_latency.part", {
          name: part.name,
          value: format(value),
        })
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
  const { t } = useTranslation()
  const config = useAgentStore((state) => state.config)
  const stt = getModel("stt", config.stt.model)
  const llm = getModel("llm", config.llm.model)
  const tts = getModel("tts", config.tts.model)

  const parts: Part[] = [
    {
      key: "stt",
      name:
        stt?.name ??
        t("components.flow.sidepanel.config.cost_latency.parts.stt"),
      usdPerMinute: stt?.usdPerMinute ?? 0,
      latencyMs: stt?.latencyMs ?? 0,
    },
    {
      key: "llm",
      name:
        llm?.name ??
        t("components.flow.sidepanel.config.cost_latency.parts.llm"),
      usdPerMinute: llm?.usdPerMinute ?? 0,
      latencyMs: llm?.latencyMs ?? 0,
    },
    {
      key: "tts",
      name:
        tts?.name ??
        t("components.flow.sidepanel.config.cost_latency.parts.tts"),
      usdPerMinute: tts?.usdPerMinute ?? 0,
      latencyMs: tts?.latencyMs ?? 0,
    },
    {
      key: "platform",
      name: t("components.flow.sidepanel.config.cost_latency.parts.platform"),
      usdPerMinute: PLATFORM_USD_PER_MINUTE,
      latencyMs: 0,
    },
  ]

  const cost = parts.reduce((sum, part) => sum + part.usdPerMinute, 0)
  const latency = parts.reduce((sum, part) => sum + part.latencyMs, 0)

  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-3 text-xs text-muted-foreground">
      {env.IS_CLOUD ? (
        <>
          <p>
            {t("components.flow.sidepanel.config.cost_latency.cost")}{" "}
            <span className="text-foreground tabular-nums">
              {formatUsdPerMinute(cost)}
            </span>
          </p>
          <ProportionBar
            parts={parts}
            amount={(part) => part.usdPerMinute}
            format={formatUsdPerMinute}
          />
        </>
      ) : null}
      <p>
        {t("components.flow.sidepanel.config.cost_latency.latency")}{" "}
        <span className="text-foreground tabular-nums">
          {formatLatency(latency)}
        </span>
      </p>
      <ProportionBar
        parts={parts}
        amount={(part) => part.latencyMs}
        format={formatLatency}
      />
    </div>
  )
}
