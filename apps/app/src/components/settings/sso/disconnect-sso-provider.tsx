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
  const deleteProviderMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.sso.deleteProvider({ providerId })
      if (result.error) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      toast.success("Provider disconnected")
      onDisconnected()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <FieldGroup>
      <FieldSet>
        <FieldLegend className="mb-0">Danger zone</FieldLegend>
      </FieldSet>

      <AlertDialog onOpenChange={() => deleteProviderMutation.reset()}>
        <Item variant="outline">
          <ItemContent>
            <ItemTitle>Disconnect provider</ItemTitle>
            <ItemDescription>
              Permanently delete this connection
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
                  Disconnect provider
                </Button>
              }
            />
          </ItemActions>
        </Item>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect provider</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete this connection
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProviderMutation.isPending}>
              Cancel
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
                "Disconnect provider"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FieldGroup>
  )
}
