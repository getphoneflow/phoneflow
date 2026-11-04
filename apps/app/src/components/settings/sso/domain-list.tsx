import { PlusIcon, XIcon } from "lucide-react"
import {
  type Control,
  Controller,
  type FieldArrayPath,
  type FieldValues,
  type Path,
  useFieldArray,
} from "react-hook-form"
import * as z from "zod"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { useTranslation } from "@/lib/i18n"

export const domainListSchema = z
  .array(
    z.object({
      value: z
        .string()
        .trim()
        .min(1, "components.settings.sso.domain_list.domain.required")
        .refine(
          (value) => !value.includes(" "),
          "components.settings.sso.domain_list.domain.required"
        ),
    })
  )
  .min(1, "components.settings.sso.domain_list.domains.min")

export function DomainList<T extends FieldValues>({
  control,
  disabled,
}: {
  control: Control<T>
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const { fields, append, remove } = useFieldArray({
    control,
    name: "domains" as FieldArrayPath<T>,
  })

  return (
    <FieldGroup className="gap-4">
      <FieldLabel>{t("components.settings.sso.domain_list.label")}</FieldLabel>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <Controller
            name={`domains.${index}.value` as Path<T>}
            control={control}
            render={({ field: input, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                className="min-w-0 flex-1"
              >
                <Input
                  {...input}
                  id={input.name}
                  placeholder={t(
                    "components.settings.sso.domain_list.domain.placeholder"
                  )}
                  aria-invalid={fieldState.invalid}
                  disabled={disabled}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          {fields.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-0.5 shrink-0"
              onClick={() => remove(index)}
              disabled={disabled}
              aria-label={t("components.settings.sso.domain_list.remove", {
                index: index + 1,
              })}
            >
              <XIcon />
            </Button>
          ) : null}
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => append({ value: "" } as never)}
        disabled={disabled}
      >
        <PlusIcon />
        {t("components.settings.sso.domain_list.add")}
      </Button>
    </FieldGroup>
  )
}
