import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@workspace/ui/components/item"
import { DisableTwoFactorDialog } from "@/components/settings/account/disable-two-factor-dialog"
import { EnableTwoFactorDialog } from "@/components/settings/account/enable-two-factor-dialog"
import { RegenerateBackupCodesDialog } from "@/components/settings/account/regenerate-backup-codes-dialog"

type TwoFactorAuthProps = {
  twoFactorEnabled: boolean
  accounts: { providerId: string }[]
}

export function TwoFactorAuth({
  twoFactorEnabled,
  accounts,
}: TwoFactorAuthProps) {
  const hasPassword = accounts.some(
    (account) => account.providerId === "credential"
  )

  if (!hasPassword) {
    return null
  }

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>Two-factor authentication</ItemTitle>
        <ItemDescription>
          {twoFactorEnabled
            ? "Authenticator app is enabled"
            : "Add an authenticator app for extra account security"}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        {twoFactorEnabled ? (
          <>
            <RegenerateBackupCodesDialog />
            <DisableTwoFactorDialog />
          </>
        ) : (
          <EnableTwoFactorDialog />
        )}
      </ItemActions>
    </Item>
  )
}
