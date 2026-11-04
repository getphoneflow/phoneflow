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
import { useTranslation } from "@/lib/i18n"

type TwoFactorAuthProps = {
  twoFactorEnabled: boolean
  accounts: { providerId: string }[]
}

export function TwoFactorAuth({
  twoFactorEnabled,
  accounts,
}: TwoFactorAuthProps) {
  const { t } = useTranslation()
  const hasPassword = accounts.some(
    (account) => account.providerId === "credential"
  )

  if (!hasPassword) {
    return null
  }

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>
          {t("components.settings.account.two_factor_auth.title")}
        </ItemTitle>
        <ItemDescription>
          {twoFactorEnabled
            ? t("components.settings.account.two_factor_auth.enabled")
            : t("components.settings.account.two_factor_auth.disabled")}
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
