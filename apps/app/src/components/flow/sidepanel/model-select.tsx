import { ArrowUpDownIcon, Search } from "lucide-react"
import { useState } from "react"

import {
  formatLatencyMs,
  formatUsdPerMinute,
  getModels,
  type ModelOption,
} from "@workspace/shared/models/helpers"
import type { ModelKind } from "@workspace/shared/models/types"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { InputGroupAddon } from "@workspace/ui/components/input-group"
import { ProviderIcon } from "@/components/flow/sidepanel/provider-icon"
import { env } from "@/lib/env"
import { useTranslation } from "@/lib/i18n"

type ModelSort = "default" | "price" | "latency" | "score"

type ScoreOrder = 1 | -1

const searchPlaceholder = {
  stt: "components.flow.sidepanel.model_select.search.stt",
  llm: "components.flow.sidepanel.model_select.search.llm",
  tts: "components.flow.sidepanel.model_select.search.tts",
}

const scoreMeta: Record<
  ModelKind,
  { label: string; order: ScoreOrder; format: string }
> = {
  stt: {
    label: "components.flow.sidepanel.model_select.score.wer_label",
    order: 1,
    format: "components.flow.sidepanel.model_select.score.wer_value",
  },
  llm: {
    label: "components.flow.sidepanel.model_select.score.label",
    order: -1,
    format: "components.flow.sidepanel.model_select.score.value",
  },
  tts: {
    label: "components.flow.sidepanel.model_select.score.label",
    order: -1,
    format: "components.flow.sidepanel.model_select.score.value",
  },
}

function formatScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1)
}

function ModelRow({
  model,
  formatScoreLabel,
}: {
  model: ModelOption
  formatScoreLabel: (score: number) => string
}) {
  return (
    <div className="flex min-w-0 flex-1 gap-2 text-left">
      <ProviderIcon providerId={model.providerId} className="mt-1" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{model.name}</div>
        <div className="truncate text-xs text-muted-foreground tabular-nums">
          {formatScoreLabel(model.score)}
          {` · ${formatLatencyMs(model.latencyMs)}`}
          {env.IS_CLOUD ? ` · ${formatUsdPerMinute(model.usdPerMinute)}` : ""}
        </div>
      </div>
    </div>
  )
}

function sortModels(
  models: ModelOption[],
  sort: ModelSort,
  scoreOrder: ScoreOrder
) {
  if (sort === "default") return models

  return [...models].sort((a, b) => {
    if (sort === "price") return a.usdPerMinute - b.usdPerMinute
    if (sort === "latency") return a.latencyMs - b.latencyMs
    return (a.score - b.score) * scoreOrder
  })
}

function filterModel(model: ModelOption, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true

  return `${model.name} ${model.providerName}`.toLowerCase().includes(q)
}

export function ModelSelect({
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
  const { t } = useTranslation()
  const [sort, setSort] = useState<ModelSort>("default")
  const {
    label: scoreLabel,
    order: scoreOrder,
    format: scoreFormat,
  } = scoreMeta[kind]
  const formatScoreLabel = (score: number) =>
    t(scoreFormat, { score: formatScore(score) })
  const models = sortModels(getModels(kind), sort, scoreOrder)
  const selectedModel = models.find((model) => model.id === modelId)!

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Combobox
        autoHighlight
        items={models}
        value={selectedModel}
        readOnly={readOnly}
        onValueChange={(next) => {
          if (next) onModelChange(next.id)
        }}
        itemToStringLabel={(model) => model.name}
        isItemEqualToValue={(a, b) => a.id === b.id}
        filter={filterModel}
      >
        <ComboboxTrigger>
          <ComboboxValue>
            {(value: ModelOption) => (
              <ModelRow model={value} formatScoreLabel={formatScoreLabel} />
            )}
          </ComboboxValue>
        </ComboboxTrigger>
        <ComboboxContent className="w-(--anchor-width) max-w-(--anchor-width) min-w-(--anchor-width)">
          <div className="flex items-center gap-1.5 p-1.5">
            <ComboboxInput
              showTrigger={false}
              placeholder={t(searchPlaceholder[kind])}
              className="min-w-0 flex-1"
            >
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
            </ComboboxInput>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={t(
                    "components.flow.sidepanel.model_select.sort.label"
                  )}
                >
                  <ArrowUpDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={sort}
                  onValueChange={(value) => setSort(value as ModelSort)}
                >
                  <DropdownMenuRadioItem value="default">
                    {t("components.flow.sidepanel.model_select.sort.default")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="price">
                    {t("components.flow.sidepanel.model_select.sort.price")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="latency">
                    {t("components.flow.sidepanel.model_select.sort.latency")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="score">
                    {t(scoreLabel)}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ComboboxEmpty>
            {t("components.flow.sidepanel.model_select.empty")}
          </ComboboxEmpty>
          <ComboboxList className="pt-0 min-h-80">
            {(model: ModelOption) => (
              <ComboboxItem key={model.id} value={model}>
                <ModelRow model={model} formatScoreLabel={formatScoreLabel} />
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  )
}
