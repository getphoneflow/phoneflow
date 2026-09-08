import { useBlocker } from "@tanstack/react-router"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { hasUnsavedAgentChanges } from "@/components/flow/agent-config"
import { useAgentStore } from "@/stores/agent"

type UnsavedChangesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDiscard: () => void
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onDiscard,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            All unsaved changes will be lost
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDiscard}>
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function UnsavedChangesGuard() {
  const hasUnsavedChanges = useAgentStore((state) =>
    hasUnsavedAgentChanges(state.config, state.savedConfig)
  )
  const blocker = useBlocker({
    shouldBlockFn: () => {
      const { config, savedConfig } = useAgentStore.getState()
      return hasUnsavedAgentChanges(config, savedConfig)
    },
    enableBeforeUnload: () => {
      const { config, savedConfig } = useAgentStore.getState()
      return hasUnsavedAgentChanges(config, savedConfig)
    },
    withResolver: true,
    disabled: !hasUnsavedChanges,
  })

  return (
    <UnsavedChangesDialog
      open={blocker.status === "blocked"}
      onOpenChange={(open) => {
        if (!open) {
          blocker.reset?.()
        }
      }}
      onDiscard={() => blocker.proceed?.()}
    />
  )
}
