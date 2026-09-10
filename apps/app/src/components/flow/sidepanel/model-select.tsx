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

type ModelSort = "default" | "price" | "latency"

function ModelRow({ model }: { model: ModelOption }) {
  return (
    <div className="flex min-w-0 flex-1 gap-2 text-left">
      <ProviderIcon providerId={model.providerId} className="mt-1" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{model.name}</div>
        <div className="truncate text-xs text-muted-foreground tabular-nums">
          {formatLatencyMs(model.latencyMs)}
          {env.IS_CLOUD ? ` · ${formatUsdPerMinute(model.usdPerMinute)}` : ""}
        </div>
      </div>
    </div>
  )
}

function sortModels(models: ModelOption[], sort: ModelSort) {
  if (sort === "default") return models
  return [...models].sort((a, b) =>
    sort === "price"
      ? a.usdPerMinute - b.usdPerMinute
      : a.latencyMs - b.latencyMs
  )
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
  const [sort, setSort] = useState<ModelSort>("default")
  const models = sortModels(getModels(kind), sort)
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
            {(value: ModelOption) => <ModelRow model={value} />}
          </ComboboxValue>
        </ComboboxTrigger>
        <ComboboxContent className="w-(--anchor-width) max-w-(--anchor-width) min-w-(--anchor-width)">
          <div className="flex items-center gap-1.5 p-1.5">
            <ComboboxInput
              showTrigger={false}
              placeholder={`Search ${label} models...`}
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
                  aria-label="Sort models"
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
                    Default
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="price">
                    Price
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="latency">
                    Latency
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ComboboxEmpty>No models found</ComboboxEmpty>
          <ComboboxList className="pt-0">
            {(model: ModelOption) => (
              <ComboboxItem key={model.id} value={model}>
                <ModelRow model={model} />
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  )
}
