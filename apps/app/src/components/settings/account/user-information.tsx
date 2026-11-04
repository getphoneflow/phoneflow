import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { LanguageSelect } from "@/components/language-select"
import { ProfilePicture } from "@/components/settings/account/profile-picture"
import { updateUser } from "@/lib/auth/client"
import { useTranslation } from "@/lib/i18n"
import { TIME_ZONES } from "@/lib/time"
import { zodResolverI18n } from "@/lib/zod-resolver"

const userInformationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "components.settings.account.user_information.name.required"),
  timezone: z.string().trim().min(1),
})

type UserInformationValues = z.infer<typeof userInformationSchema>

type UserInformationProps = {
  name: string
  email: string
  image: string | null | undefined
  timezone: string
}

export function UserInformation({
  name,
  email,
  image,
  timezone,
}: UserInformationProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const form = useForm<UserInformationValues>({
    resolver: zodResolverI18n(userInformationSchema),
    defaultValues: {
      name,
      timezone,
    },
  })

  const updateUserInformationMutation = useMutation({
    mutationFn: async (values: UserInformationValues) => {
      const result = await updateUser({
        name: values.name,
        timezone: values.timezone,
      })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success(
        t("components.settings.account.user_information.toasts.updated")
      )
      queryClient.invalidateQueries({ queryKey: ["session"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend>
          {t("components.settings.account.user_information.title")}
        </FieldLegend>
        <FieldDescription>
          {t("components.settings.account.user_information.description")}
        </FieldDescription>
      </FieldSet>

      <Field>
        <FieldLabel>
          {t("components.settings.account.user_information.profile_picture")}
        </FieldLabel>
        <ProfilePicture name={name} image={image} />
      </Field>

      <form
        onSubmit={form.handleSubmit((values) =>
          updateUserInformationMutation.mutate(values)
        )}
        noValidate
      >
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  {t("components.settings.account.user_information.name.label")}
                </FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  autoComplete="name"
                  aria-invalid={fieldState.invalid}
                  disabled={updateUserInformationMutation.isPending}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Field>
            <FieldLabel htmlFor="email">
              {t("components.settings.account.user_information.email.label")}
            </FieldLabel>
            <Input id="email" type="email" value={email} readOnly />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t("languages.label")}</FieldLabel>
              <LanguageSelect
                id="language"
                disabled={updateUserInformationMutation.isPending}
              />
            </Field>

            <Controller
              name="timezone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {t(
                      "components.settings.account.user_information.timezone.label"
                    )}
                  </FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => value && field.onChange(value)}
                    disabled={updateUserInformationMutation.isPending}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue
                        placeholder={t(
                          "components.settings.account.user_information.timezone.placeholder"
                        )}
                      >
                        {field.value}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent
                      alignItemWithTrigger={false}
                      align="start"
                      className="max-h-72"
                    >
                      {TIME_ZONES.map((timeZone) => (
                        <SelectItem key={timeZone} value={timeZone}>
                          {timeZone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>

          <Button
            type="submit"
            disabled={updateUserInformationMutation.isPending}
          >
            {updateUserInformationMutation.isPending ? (
              <Spinner />
            ) : (
              t("common.actions.save")
            )}
          </Button>
        </FieldGroup>
      </form>
    </FieldGroup>
  )
}
