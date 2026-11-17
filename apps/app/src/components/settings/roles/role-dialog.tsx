import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { ac } from "@workspace/shared/auth/roles"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { PermissionFields } from "@/components/settings/permission-fields"
import { organization } from "@/lib/auth/client"
import { useTranslation } from "@/lib/i18n"

type OrganizationRole = NonNullable<
  Awaited<ReturnType<typeof organization.listRoles>>["data"]
>[number]

type RoleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: OrganizationRole
}

export function RoleDialog({ open, onOpenChange, role }: RoleDialogProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [permission, setPermission] = useState<Record<string, string[]>>({})
  const [openRoleId, setOpenRoleId] = useState<string | null>(null)
  const nextOpenRoleId = open ? (role?.id ?? "new") : null

  if (nextOpenRoleId !== openRoleId) {
    setOpenRoleId(nextOpenRoleId)
    setName(role?.displayName ?? "")
    setNameError(null)
    setPermission(
      Object.fromEntries(
        Object.entries(role?.permission ?? {}).filter(
          (entry): entry is [string, string[]] => Array.isArray(entry[1])
        )
      )
    )
  }

  const saveRoleMutation = useMutation({
    mutationFn: async () => {
      const displayName = name.trim()
      const nextPermission = Object.fromEntries(
        Object.entries(permission).filter(([, actions]) => actions.length > 0)
      )
      const result = role
        ? await organization.updateRole({
            roleId: role.id,
            data: { permission: nextPermission, displayName },
          })
        : await organization.createRole({
            role: displayName.toLowerCase(),
            permission: nextPermission,
            additionalFields: { displayName },
          })

      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success(
        role
          ? t("components.settings.roles.role_dialog.toasts.updated", {
              name: name.trim(),
            })
          : t("components.settings.roles.role_dialog.toasts.created", {
              name: name.trim(),
            })
      )
      onOpenChange(false)
      queryClient.invalidateQueries({ queryKey: ["organization-roles"] })
      queryClient.invalidateQueries({ queryKey: ["has-permission"] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  function toggle(resource: string, action: string, checked: boolean) {
    setPermission((current) => {
      const actions = new Set(current[resource] ?? [])
      if (checked) {
        actions.add(action)
      } else {
        actions.delete(action)
      }
      return { ...current, [resource]: [...actions] }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        saveRoleMutation.reset()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {role
              ? t("components.settings.roles.role_dialog.edit_title")
              : t("components.settings.roles.role_dialog.create_title")}
          </DialogTitle>
          <DialogDescription>
            {role
              ? t("components.settings.roles.role_dialog.edit_description", {
                  name: role.displayName,
                })
              : t("components.settings.roles.role_dialog.create_description")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            const roleName = name.trim()
            if (!roleName) {
              setNameError(
                "components.settings.roles.role_dialog.name.required"
              )
              return
            }
            if (!role && roleName.toLowerCase() === "owner") {
              setNameError(
                "components.settings.roles.role_dialog.name.owner_exists"
              )
              return
            }
            setNameError(null)
            saveRoleMutation.mutate()
          }}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(nameError)}>
              <FieldLabel htmlFor="role-name">
                {t("components.settings.roles.role_dialog.name.label")}
              </FieldLabel>
              <Input
                id="role-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t(
                  "components.settings.roles.role_dialog.name.placeholder"
                )}
                autoFocus={!role}
                disabled={saveRoleMutation.isPending}
                aria-invalid={Boolean(nameError)}
              />
              {nameError ? <FieldError>{t(nameError)}</FieldError> : null}
            </Field>

            <PermissionFields
              statements={ac.statements}
              idPrefix="role"
              permission={permission}
              disabled={saveRoleMutation.isPending}
              onToggle={toggle}
            />
          </FieldGroup>

          <DialogFooter className="mt-6">
            <DialogClose>
              <Button variant="outline" disabled={saveRoleMutation.isPending}>
                {t("common.actions.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saveRoleMutation.isPending}>
              {saveRoleMutation.isPending ? (
                <Spinner className="mx-6" />
              ) : role ? (
                t("common.actions.save")
              ) : (
                t("components.settings.roles.role_dialog.create_submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
