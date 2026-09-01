import { zodResolver } from "@hookform/resolvers/zod"
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
import { updateUser } from "@/lib/auth/client"
import { TIME_ZONES } from "@/lib/time"

const userInformationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  timezone: z.string().trim().min(1),
})

type UserInformationValues = z.infer<typeof userInformationSchema>

type UserInformationProps = {
  name: string
  email: string
  timezone: string
}

export function UserInformation({
  name,
  email,
  timezone,
}: UserInformationProps) {
  const queryClient = useQueryClient()

  const form = useForm<UserInformationValues>({
    resolver: zodResolver(userInformationSchema),
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
      toast.success("Account information updated")
      queryClient.invalidateQueries({ queryKey: ["session"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend>Account information</FieldLegend>
        <FieldDescription>Update your account information</FieldDescription>
      </FieldSet>

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
                <FieldLabel htmlFor={field.name}>Name</FieldLabel>
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
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" type="email" value={email} readOnly />
          </Field>

          <Controller
            name="timezone"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Timezone</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => value && field.onChange(value)}
                  disabled={updateUserInformationMutation.isPending}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Timezone">
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

          <Button
            type="submit"
            disabled={updateUserInformationMutation.isPending}
          >
            {updateUserInformationMutation.isPending ? <Spinner /> : "Save"}
          </Button>
        </FieldGroup>
      </form>
    </FieldGroup>
  )
}
