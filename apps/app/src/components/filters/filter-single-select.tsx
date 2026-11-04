import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { useTranslation } from "@/lib/i18n"

export type SingleSelectOption = {
  value: string
  label: string
  description?: string
}

export function FilterSingleSelect({
  label,
  placeholder,
  items,
  selectedValue,
  onSelectedValueChange,
  emptyText,
}: {
  label: string
  placeholder: string
  items: SingleSelectOption[]
  selectedValue?: string
  onSelectedValueChange: (value: string | undefined) => void
  emptyText?: string
}) {
  const { t } = useTranslation()
  const selectedItem =
    items.find((item) => item.value === selectedValue) ?? null

  return (
    <Field className="w-48 gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <Combobox
        autoHighlight
        items={items}
        value={selectedItem}
        onValueChange={(next) => {
          onSelectedValueChange(next?.value)
        }}
        itemToStringValue={(item) =>
          item.description ? `${item.label} ${item.description}` : item.label
        }
      >
        <ComboboxInput placeholder={placeholder} showClear={!!selectedItem} />
        <ComboboxContent>
          <ComboboxEmpty>
            {emptyText ?? t("components.filters.filter_single_select.empty")}
          </ComboboxEmpty>
          <ComboboxList>
            {(item: SingleSelectOption) => (
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
