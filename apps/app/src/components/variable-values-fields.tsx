import type { DynamicVariable } from "@workspace/shared/api/agent-config/types"
import type { CallVariableValues } from "@workspace/shared/api/calls/types"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { useTranslation } from "@/lib/i18n"

type VariableValuesFieldsProps = {
  variables: DynamicVariable[]
  values: CallVariableValues
  onValueChange: (key: string, value: string) => void
  className?: string
  readOnly?: boolean
}

export function callVariableRecord(
  variables: DynamicVariable[],
  values: CallVariableValues
) {
  const entries = variables.flatMap((variable) => {
    const value = values[variable.key]
    return value ? [[variable.key, value] as const] : []
  })

  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

export function VariableValuesFields({
  variables,
  values,
  onValueChange,
  className,
  readOnly = false,
}: VariableValuesFieldsProps) {
  const { t } = useTranslation()

  if (variables.length === 0) {
    return null
  }

  return (
    <FieldGroup className={className}>
      {variables.map((variable) => (
        <Field key={variable.key}>
          <FieldLabel>{variable.key}</FieldLabel>
          <Input
            value={values[variable.key] ?? variable.defaultValue ?? ""}
            onChange={(event) =>
              onValueChange(variable.key, event.target.value)
            }
            placeholder={t("components.variable_values_fields.placeholder", {
              variable: `{{${variable.key}}}`,
            })}
            readOnly={readOnly}
          />
        </Field>
      ))}
    </FieldGroup>
  )
}
