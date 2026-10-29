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

type OrganizationRole = NonNullable<
  Awaited<ReturnType<typeof organization.listRoles>>["data"]
>[number]

const resourceLabels: Record<string, string> = {
  organization: "Organization",
  member: "Members",
  invitation: "Invitations",
  team: "Teams",
  ac: "Roles",
  agent: "Agents",
  phoneNumber: "Phone numbers",
  calls: "Calls",
  billing: "Billing",
}

export function resourceLabel(resource: string) {
  return resourceLabels[resource] ?? resource
}

type RoleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: OrganizationRole
}

export function RoleDialog({ open, onOpenChange, role }: RoleDialogProps) {
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
      toast.success(role ? `${name.trim()} updated` : `${name.trim()} created`)
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
          <DialogTitle>{role ? "Edit role" : "Create role"}</DialogTitle>
          <DialogDescription>
            {role
              ? `Update what "${role.displayName}" can do`
              : "Choose a name and the permissions this role should have"}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            const roleName = name.trim()
            if (!roleName) {
              setNameError("Name is required")
              return
            }
            if (!role && roleName.toLowerCase() === "owner") {
              setNameError("Owner already exists")
              return
            }
            setNameError(null)
            saveRoleMutation.mutate()
          }}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(nameError)}>
              <FieldLabel htmlFor="role-name">Name</FieldLabel>
              <Input
                id="role-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Support"
                autoFocus={!role}
                disabled={saveRoleMutation.isPending}
                aria-invalid={Boolean(nameError)}
              />
              {nameError ? <FieldError>{nameError}</FieldError> : null}
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
                            {action}
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
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saveRoleMutation.isPending}>
              {saveRoleMutation.isPending ? (
                <Spinner className="mx-6" />
              ) : role ? (
                "Save"
              ) : (
                "Create role"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
