import { Checkbox } from "@workspace/ui/components/checkbox"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { useTranslation } from "@/lib/i18n"

const resourceLabels = {
  organization: "components.settings.roles.role_dialog.resources.organization",
  member: "components.settings.roles.role_dialog.resources.member",
  invitation: "components.settings.roles.role_dialog.resources.invitation",
  team: "components.settings.roles.role_dialog.resources.team",
  ac: "components.settings.roles.role_dialog.resources.ac",
  agent: "components.settings.roles.role_dialog.resources.agent",
  phoneNumber: "components.settings.roles.role_dialog.resources.phone_number",
  calls: "components.settings.roles.role_dialog.resources.calls",
  billing: "components.settings.roles.role_dialog.resources.billing",
  knowledgeBase:
    "components.settings.roles.role_dialog.resources.knowledge_base",
  callExtraction:
    "components.settings.roles.role_dialog.resources.call_extraction",
  apiKey: "components.settings.roles.role_dialog.resources.api_key",
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

type PermissionFieldsProps = {
  statements: Record<string, readonly string[]>
  permission: Record<string, string[]>
  disabled?: boolean
  idPrefix: string
  onToggle: (resource: string, action: string, checked: boolean) => void
}

export function PermissionFields({
  statements,
  permission,
  disabled,
  idPrefix,
  onToggle,
}: PermissionFieldsProps) {
  const { resourceLabel, actionLabel } = usePermissionLabels()

  return (
    <div className="-mr-6 max-h-80 space-y-4 overflow-y-auto pl-1">
      {Object.entries(statements).map(([resource, actions]) => (
        <div key={resource} className="space-y-2">
          <div className="font-medium">{resourceLabel(resource)}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {actions.map((action) => {
              const id = `${idPrefix}-${resource}-${action}`
              return (
                <Field key={action} orientation="horizontal" className="w-auto">
                  <Checkbox
                    id={id}
                    checked={permission[resource]?.includes(action) ?? false}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      onToggle(resource, action, checked === true)
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
  )
}
