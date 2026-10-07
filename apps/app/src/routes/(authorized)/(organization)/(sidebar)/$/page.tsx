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

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/$/"
)({
  component: Page,
})

function Page() {
  return (
    <>
      <title>Page not found - PhoneFlow</title>
      <Empty className="mx-auto max-w-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Search />
          </EmptyMedia>
          <EmptyTitle className="text-xl">Page not found</EmptyTitle>
          <EmptyDescription>
            The page you're looking for doesn't exist or was moved
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="secondary" render={<Link to="/" />}>
            Return Home
          </Button>
        </EmptyContent>
      </Empty>
    </>
  )
}
