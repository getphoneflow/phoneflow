import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@workspace/ui/components/combobox"
import { Field, FieldLabel } from "@workspace/ui/components/field"

export type MultiSelectOption = {
  value: string
  label: string
  description?: string
}

export function FilterMultiSelect({
  label,
  placeholder,
  items,
  selectedValues,
  onSelectedValuesChange,
  emptyText = "No items found",
}: {
  label: string
  placeholder: string
  items: MultiSelectOption[]
  selectedValues: string[]
  onSelectedValuesChange: (values: string[]) => void
  emptyText?: string
}) {
  const anchor = useComboboxAnchor()
  const selectedItems = items.filter((item) =>
    selectedValues.includes(item.value)
  )

  return (
    <Field className="w-72 gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <Combobox
        multiple
        autoHighlight
        items={items}
        value={selectedItems}
        onValueChange={(next) => {
          onSelectedValuesChange(next.map((item) => item.value))
        }}
        itemToStringValue={(item) =>
          item.description ? `${item.label} ${item.description}` : item.label
        }
      >
        <ComboboxChips ref={anchor} className="w-full">
          <ComboboxValue>
            {(values: MultiSelectOption[]) => (
              <>
                {values.map((item) => (
                  <ComboboxChip key={item.value}>{item.label}</ComboboxChip>
                ))}
                <ComboboxChipsInput
                  placeholder={values.length === 0 ? placeholder : undefined}
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxInput showTrigger={false} placeholder="Search..." />
          <ComboboxEmpty>{emptyText}</ComboboxEmpty>
          <ComboboxList>
            {(item: MultiSelectOption) => (
              <ComboboxItem key={item.value} value={item}>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{item.label}</span>
                  {item.description ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  )
}
