import {
  createFileRoute,
  Link,
  Outlet,
  useMatchRoute,
} from "@tanstack/react-router"
import { Suspense } from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { env } from "@/lib/env"

export const Route = createFileRoute(
  "/(authorized)/(organization)/(sidebar)/settings"
)({
  component: Layout,
})

const settingsNavItems = [
  {
    title: "Account",
    to: "/settings/account",
  },
  {
    title: "Organization",
    to: "/settings/organization",
  },
  ...(env.IS_CLOUD
    ? [
        {
          title: "Billing",
          to: "/settings/billing",
        },
      ]
    : []),
  {
    title: "Members",
    to: "/settings/members",
  },
  {
    title: "Roles",
    to: "/settings/roles",
  },
]

function SettingsContentSkeleton() {
  return (
    <div className="mx-auto max-w-lg space-y-8">
      <Skeleton className="h-14 w-60" />
      <Skeleton className="h-120 w-full" />
    </div>
  )
}

function SettingsPageHeader() {
  const matchRoute = useMatchRoute()
  const activeItem = settingsNavItems.find((item) =>
    Boolean(matchRoute({ to: item.to }))
  )

  return (
    <header className="flex h-18 items-center gap-2 px-5">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
      />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">Settings</BreadcrumbItem>
          {activeItem ? (
            <>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{activeItem.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : null}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  )
}

function SettingsNav() {
  const matchRoute = useMatchRoute()

  return (
    <SidebarMenu>
      {settingsNavItems.map((item) => {
        const isActive = Boolean(matchRoute({ to: item.to }))

        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              isActive={isActive}
              render={<Link to={item.to} />}
            >
              {item.title}
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

function Layout() {
  return (
    <>
      <SettingsPageHeader />
      <div className="flex p-5">
        <div className="w-60 pr-10">
          <SettingsNav />
        </div>
        <div className="w-full lg:pr-40">
          <Suspense fallback={<SettingsContentSkeleton />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </>
  )
}
