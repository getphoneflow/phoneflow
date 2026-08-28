import { useState } from "react"
import { Label, Pie, PieChart, Sector } from "recharts"
import type { PieSectorShapeProps } from "recharts/types/polar/Pie"

import type { CallListResponse } from "@workspace/shared/api/calls/types"

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

type CallCostFields = Pick<
  CallListResponse[number],
  | "sttModel"
  | "llmModel"
  | "ttsModel"
  | "sttCost"
  | "llmCost"
  | "ttsCost"
  | "telephonyCost"
  | "platformCost"
  | "totalCost"
>

const costItems = [
  {
    key: "stt",
    label: "STT",
    modelKey: "sttModel",
    costKey: "sttCost",
    color: "#22c55e",
  },
  {
    key: "llm",
    label: "LLM",
    modelKey: "llmModel",
    costKey: "llmCost",
    color: "#facd02",
  },
  {
    key: "tts",
    label: "TTS",
    modelKey: "ttsModel",
    costKey: "ttsCost",
    color: "#38bdf8",
  },
  {
    key: "telephony",
    label: "Telephony",
    modelKey: null,
    costKey: "telephonyCost",
    color: "#8b5cf6",
  },
  {
    key: "platform",
    label: "Platform",
    modelKey: null,
    costKey: "platformCost",
    color: "#f97316",
  },
] as const

function parseCost(value: string | null) {
  return value === null ? null : Number(value)
}

const percentFormatter = new Intl.NumberFormat("en", {
  style: "percent",
  maximumFractionDigits: 1,
})

export function formatCallCost(value: number) {
  return usdFormatter.format(value)
}

export function parseCallCost(value: string | null) {
  return parseCost(value)
}

export function getCallCostBreakdown(call: CallCostFields) {
  return costItems
    .map((item) => ({
      key: item.key,
      label: item.label,
      model: item.modelKey ? call[item.modelKey] : null,
      cost: parseCost(call[item.costKey])!,
      color: item.color,
    }))
    .filter((item) => item.cost > 0)
}

export function CallCostBreakdown({ call }: { call: CallCostFields }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const totalCost = parseCost(call.totalCost)
  const breakdown = getCallCostBreakdown(call)

  if (totalCost === null || breakdown.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">No cost data available</p>
      </div>
    )
  }

  const chartData = breakdown.map((item) => ({
    key: item.key,
    cost: item.cost,
    fill: item.color,
  }))

  const activeItem =
    activeIndex === null ? null : (breakdown[activeIndex] ?? null)

  return (
    <div className="p-4">
      <div className="flex justify-center pb-4">
        <PieChart width={192} height={192}>
          <Pie
            data={chartData}
            dataKey="cost"
            nameKey="key"
            cx={96}
            cy={96}
            innerRadius={52}
            outerRadius={80}
            startAngle={+180}
            endAngle={-180}
            stroke="var(--background)"
            strokeWidth={3}
            isAnimationActive={false}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            shape={({ index, ...props }: PieSectorShapeProps) => (
              <Sector
                {...props}
                fill={chartData[index]?.fill}
                opacity={
                  activeIndex === null || index === activeIndex ? 1 : 0.45
                }
              />
            )}
          >
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                  return null
                }

                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-lg font-medium"
                    >
                      {formatCallCost(activeItem?.cost ?? totalCost)}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 18}
                      className="fill-muted-foreground text-xs"
                    >
                      {activeItem?.label ?? "Total"}
                    </tspan>
                  </text>
                )
              }}
            />
          </Pie>
        </PieChart>
      </div>
      <div>
        {breakdown.map((item, index) => (
          <div
            key={item.key}
            className="flex cursor-pointer gap-2 py-2"
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div
              className="w-1 self-stretch rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1 self-center">
              <div className="text-sm">{item.label}</div>
              {item.model ? (
                <div className="truncate text-xs text-muted-foreground">
                  {item.model}
                </div>
              ) : null}
            </div>
            <div className="text-right">
              <div className="text-sm tabular-nums">
                {formatCallCost(item.cost)}
              </div>
              <div className="text-xs text-muted-foreground">
                {percentFormatter.format(item.cost / totalCost)}
              </div>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between gap-2 pl-3 py-2">
          <span className="text-sm font-medium">Total</span>
          <span className="text-sm font-medium tabular-nums">
            {formatCallCost(totalCost)}
          </span>
        </div>
      </div>
    </div>
  )
}
