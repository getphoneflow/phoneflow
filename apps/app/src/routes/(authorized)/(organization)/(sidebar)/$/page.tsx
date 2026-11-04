import { createFileRoute, Link } from "@tanstack/react-router"
import { Search } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { useTranslation } from "@/lib/i18n"

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/$/"
)({
  component: Page,
})

function Page() {
  const { t } = useTranslation()
  return (
    <>
      <title>{t("routes.not_found.page_title")}</title>
      <Empty className="mx-auto max-w-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Search />
          </EmptyMedia>
          <EmptyTitle className="text-xl">
            {t("routes.not_found.title")}
          </EmptyTitle>
          <EmptyDescription>
            {t("routes.not_found.description")}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="secondary" render={<Link to="/" />}>
            {t("routes.not_found.return_home")}
          </Button>
        </EmptyContent>
      </Empty>
    </>
  )
}
