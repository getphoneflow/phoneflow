import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"
import { z } from "zod"

import { contactListQuerySchema } from "@workspace/shared/api/contacts/schemas"
import type {
  ContactListQuery,
  ContactListResponse,
} from "@workspace/shared/api/contacts/types"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { CallDetailSheet } from "@/components/calls/call-detail-sheet"
import { LiveCallSheet } from "@/components/calls/live-call-sheet"
import { ContactDetailSheet } from "@/components/contacts/contact-detail-sheet"
import { ContactsDataTable } from "@/components/contacts/contacts-data-table"
import { ContactsFilters } from "@/components/contacts/contacts-filters"
import { DownloadContactsDialog } from "@/components/contacts/download-contacts-dialog"
import { api } from "@/lib/api"

const contactsPageSearchSchema = contactListQuerySchema.extend({
  contactId: z.uuid().optional(),
  callId: z.uuid().optional(),
  liveCallId: z.uuid().optional(),
})

function buildContactsListPath(search: ContactListQuery) {
  const params = new URLSearchParams()
  params.set("page", String(search.page))
  params.set("pageSize", String(search.pageSize))
  params.set("sortBy", search.sortBy)
  params.set("sortDir", search.sortDir)

  if (search.q) {
    params.set("q", search.q)
  }

  if (search.firstCallFrom) {
    params.set("firstCallFrom", search.firstCallFrom)
  }

  if (search.firstCallTo) {
    params.set("firstCallTo", search.firstCallTo)
  }

  if (search.latestCallFrom) {
    params.set("latestCallFrom", search.latestCallFrom)
  }

  if (search.latestCallTo) {
    params.set("latestCallTo", search.latestCallTo)
  }

  if (search.callCountOp) {
    params.set("callCountOp", search.callCountOp)
  }

  if (search.callCount !== undefined) {
    params.set("callCount", String(search.callCount))
  }

  if (search.callCountMax !== undefined) {
    params.set("callCountMax", String(search.callCountMax))
  }

  if (search.durationOp) {
    params.set("durationOp", search.durationOp)
  }

  if (search.duration !== undefined) {
    params.set("duration", String(search.duration))
  }

  if (search.durationMax !== undefined) {
    params.set("durationMax", String(search.durationMax))
  }

  return `/contacts?${params.toString()}`
}

function queryOptions(search: ContactListQuery) {
  return {
    queryKey: ["contacts", search],
    queryFn: () => api.get<ContactListResponse>(buildContactsListPath(search)),
  }
}

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/contacts/"
)({
  validateSearch: contactsPageSearchSchema,
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
            <BreadcrumbPage>Contacts</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex space-x-3">
        <DownloadContactsDialog />
      </div>
    </header>
  )
}

function Page() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <>
      <title>Contacts - PhoneFlow</title>
      <Header />
      <div className="p-5 pt-0">
        <ContactsFilters
          filters={search}
          onFiltersChange={(nextFilters) => {
            navigate({
              search: {
                ...search,
                ...nextFilters,
                page: 1,
              },
            })
          }}
        />
        <Suspense fallback={<Skeleton className="h-120 w-full rounded-md" />}>
          <ContactsTable />
        </Suspense>
      </div>
    </>
  )
}

function ContactsTable() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { contactId, callId, liveCallId, ...listQuery } = search
  const { data } = useSuspenseQuery(queryOptions(listQuery))
  const { sortBy, sortDir } = listQuery

  return (
    <>
      <ContactsDataTable
        items={data.items}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        sortBy={sortBy}
        sortDir={sortDir}
        onContactSelect={(nextContactId) => {
          navigate({
            search: {
              ...search,
              contactId: nextContactId,
              callId: undefined,
              liveCallId: undefined,
            },
          })
        }}
        onSortingChange={(sorting) => {
          navigate({
            search: {
              ...search,
              ...sorting,
              page: 1,
            },
          })
        }}
        onPageChange={(page) => {
          navigate({
            search: {
              ...search,
              page,
            },
          })
        }}
        onPageSizeChange={(pageSize) => {
          navigate({
            search: {
              ...search,
              pageSize,
              page: 1,
            },
          })
        }}
      />
      <ContactDetailSheet
        contactId={contactId}
        open={Boolean(contactId)}
        onClose={() => {
          navigate({
            search: {
              ...search,
              contactId: undefined,
              callId: undefined,
              liveCallId: undefined,
            },
          })
        }}
        onCallSelect={(nextCallId) => {
          navigate({
            search: {
              ...search,
              callId: nextCallId,
              liveCallId: undefined,
            },
          })
        }}
        onLiveCallSelect={(nextLiveCallId) => {
          navigate({
            search: {
              ...search,
              liveCallId: nextLiveCallId,
              callId: undefined,
            },
          })
        }}
      />
      <CallDetailSheet
        callId={callId}
        open={Boolean(callId)}
        onClose={() => {
          navigate({ search: { ...search, callId: undefined } })
        }}
      />
      <LiveCallSheet
        callId={liveCallId}
        open={Boolean(liveCallId)}
        onClose={() => {
          navigate({ search: { ...search, liveCallId: undefined } })
        }}
      />
    </>
  )
}
