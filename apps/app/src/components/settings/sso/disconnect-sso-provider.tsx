import { useMutation } from "@tanstack/react-query"
import { Trash2Icon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import {
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@workspace/ui/components/item"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { authClient } from "@/lib/auth/client"
import { useTranslation } from "@/lib/i18n"

type DisconnectSsoProviderProps = {
  canUpdate: boolean
  providerId: string
  onDisconnected: () => void
}

export function DisconnectSsoProvider({
  canUpdate,
  providerId,
  onDisconnected,
}: DisconnectSsoProviderProps) {
  const { t } = useTranslation()
  const deleteProviderMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.sso.deleteProvider({ providerId })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success(
        t("components.settings.sso.disconnect_sso_provider.toasts.disconnected")
      )
      onDisconnected()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend className="mb-0">
          {t("components.settings.sso.disconnect_sso_provider.danger_zone")}
        </FieldLegend>
      </FieldSet>

      <AlertDialog onOpenChange={() => deleteProviderMutation.reset()}>
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>
              {t("components.settings.sso.disconnect_sso_provider.title")}
            </ItemTitle>
            <ItemDescription>
              {t("components.settings.sso.disconnect_sso_provider.description")}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!canUpdate}
                >
                  <Trash2Icon className="size-4" />
                  {t("components.settings.sso.disconnect_sso_provider.trigger")}
                </Button>
              }
            />
          </ItemActions>
        </Item>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                "components.settings.sso.disconnect_sso_provider.dialog.title"
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "components.settings.sso.disconnect_sso_provider.dialog.description"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProviderMutation.isPending}>
              {t("common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteProviderMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                deleteProviderMutation.mutate()
              }}
            >
              {deleteProviderMutation.isPending ? (
                <Spinner className="mx-8" />
              ) : (
                t(
                  "components.settings.sso.disconnect_sso_provider.dialog.confirm"
                )
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FieldGroup>
  )
}
