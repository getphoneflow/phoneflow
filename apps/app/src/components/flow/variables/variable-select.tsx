import { useState } from "react"

import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@workspace/ui/components/combobox"
import {
  createInputVariable,
  type VariableSuggestion,
  type VariableSuggestionGroup,
  variableGroupLabelKeys,
  variableSuggestions,
} from "@/components/flow/variables/suggestions"
import { useTranslation } from "@/lib/i18n"
import { useAgentStore } from "@/stores/agent"

export function VariableSelect({
  value,
  onChange,
  readOnly = false,
}: {
  value: string
  onChange: (key: string) => void
  readOnly?: boolean
}) {
  const { t } = useTranslation()
  const config = useAgentStore((state) => state.config)
  const [query, setQuery] = useState("")
  const suggestions = variableSuggestions(
    config,
    query.length > 0 && query !== value ? query : ""
  )
  const groups: VariableSuggestionGroup[] = [...suggestions.groups]
  if (suggestions.createKey) {
    groups.push({
      label: "",
      items: [
        {
          key: suggestions.createKey,
          label: t("components.flow.variables.variable_select.create", {
            key: suggestions.createKey,
          }),
          create: true,
        },
      ],
    })
  }

  const selected: VariableSuggestion | null = value
    ? { key: value, label: value }
    : null

  return (
    <Combobox
      items={groups}
      value={selected}
      readOnly={readOnly}
      filter={null}
      isItemEqualToValue={(item, selected) => item.key === selected.key}
      itemToStringLabel={(item) => item.key}
      itemToStringValue={(item) => item.key}
      onInputValueChange={setQuery}
      onValueChange={(item) => {
        if (!item) {
          return
        }
        if (item.create) {
          createInputVariable(item.key)
        }
        onChange(item.key)
      }}
    >
      <ComboboxInput placeholder="variable_name" className="w-full" />
      <ComboboxContent>
        <ComboboxEmpty>
          {t("components.flow.variables.variable_select.empty")}
        </ComboboxEmpty>
        <ComboboxList>
          {(group: VariableSuggestionGroup) => (
            <ComboboxGroup key={group.label || "create"} items={group.items}>
              {group.label ? (
                <ComboboxLabel>
                  {variableGroupLabelKeys[group.label]
                    ? t(variableGroupLabelKeys[group.label])
                    : group.label}
                </ComboboxLabel>
              ) : null}
              <ComboboxCollection>
                {(item: VariableSuggestion) => (
                  <ComboboxItem key={item.key} value={item}>
                    {item.label}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
