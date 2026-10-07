import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import type { PhoneNumberListResponse } from "@workspace/shared/api/phone-numbers/types"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { AddPhoneNumberForm } from "@/components/phone-numbers/add-phone-number-form"
import { PhoneNumberSheet } from "@/components/phone-numbers/phone-number-sheet"
import { PhoneNumbersDataTable } from "@/components/phone-numbers/phone-numbers-data-table"
import { TestCallButton } from "@/components/phone-numbers/test-call-button"
import { api } from "@/lib/api"

const phoneNumbersPageSearchSchema = z
  .object({
    phoneNumberId: z.uuid().optional(),
  })
  .strict()

function queryOptions() {
  return {
    queryKey: ["phone-numbers"],
    queryFn: () => api.get<PhoneNumberListResponse>("/phone-numbers"),
  }
}

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/phone-numbers/"
)({
  validateSearch: phoneNumbersPageSearchSchema,
  component: Page,
})

function Header() {
  return (
    <header className="flex h-18 items-center gap-2 px-5">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
      />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Phone numbers</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex space-x-3">
        <TestCallButton />
        <AddPhoneNumberForm />
      </div>
    </header>
  )
}

function Page() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: phoneNumbers } = useSuspenseQuery(queryOptions())

  return (
    <>
      <title>Phone numbers - PhoneFlow</title>
      <Header />
      <div className="p-5 pt-0">
        <PhoneNumbersDataTable
          data={phoneNumbers}
          onPhoneNumberSelect={(phoneNumberId) => {
            navigate({ search: (prev) => ({ ...prev, phoneNumberId }) })
          }}
        />
        <PhoneNumberSheet
          phoneNumberId={search.phoneNumberId}
          open={Boolean(search.phoneNumberId)}
          onClose={() => {
            navigate({
              search: { ...search, phoneNumberId: undefined },
            })
          }}
        />
      </div>
    </>
  )
}
