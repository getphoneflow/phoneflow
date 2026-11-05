import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { ac } from "@workspace/shared/auth/roles"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
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
import { organization } from "@/lib/auth/client"
import { useTranslation } from "@/lib/i18n"

type OrganizationRole = NonNullable<
  Awaited<ReturnType<typeof organization.listRoles>>["data"]
>[number]

const resourceLabels = {
  organization: "components.settings.roles.role_dialog.resources.organization",
  member: "components.settings.roles.role_dialog.resources.member",
  invitation: "components.settings.roles.role_dialog.resources.invitation",
  team: "components.settings.roles.role_dialog.resources.team",
  ac: "components.settings.roles.role_dialog.resources.ac",
  agent: "components.settings.roles.role_dialog.resources.agent",
  phoneNumber: "components.settings.roles.role_dialog.resources.phone_number",
  calls: "components.settings.roles.role_dialog.resources.calls",
  doNotCall: "components.settings.roles.role_dialog.resources.do_not_call",
  billing: "components.settings.roles.role_dialog.resources.billing",
} satisfies Record<string, string>

const actionLabels = {
  create: "components.settings.roles.role_dialog.actions.create",
  read: "components.settings.roles.role_dialog.actions.read",
  update: "components.settings.roles.role_dialog.actions.update",
  delete: "components.settings.roles.role_dialog.actions.delete",
  cancel: "components.settings.roles.role_dialog.actions.cancel",
  purchase: "components.settings.roles.role_dialog.actions.purchase",
} satisfies Record<string, string>

export function usePermissionLabels() {
  const { t } = useTranslation()

  return {
    resourceLabel(resource: string): string {
      const key: string | undefined =
        resourceLabels[resource as keyof typeof resourceLabels]
      return key ? t(key) : resource
    },
    actionLabel(action: string): string {
      const key: string | undefined =
        actionLabels[action as keyof typeof actionLabels]
      return key ? t(key) : action
    },
  }
}

type RoleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: OrganizationRole
}

export function RoleDialog({ open, onOpenChange, role }: RoleDialogProps) {
  const { t } = useTranslation()
  const { resourceLabel, actionLabel } = usePermissionLabels()
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

            <div className="-mr-6 max-h-80 space-y-4 overflow-y-auto pl-1">
              {Object.entries(ac.statements).map(([resource, actions]) => (
                <div key={resource} className="space-y-2">
                  <div className="font-medium">{resourceLabel(resource)}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {actions.map((action) => {
                      const id = `${resource}-${action}`
                      return (
                        <Field
                          key={action}
                          orientation="horizontal"
                          className="w-auto"
                        >
                          <Checkbox
                            id={id}
                            checked={
                              permission[resource]?.includes(action) ?? false
                            }
                            disabled={saveRoleMutation.isPending}
                            onCheckedChange={(checked) =>
                              toggle(resource, action, checked === true)
                            }
                          />
                          <FieldLabel htmlFor={id} className="capitalize">
                            {actionLabel(action)}
                          </FieldLabel>
                        </Field>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
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
