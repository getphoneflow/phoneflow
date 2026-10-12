import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
} from "@workspace/ui/components/sidebar"
import { PhoneflowIcon } from "@/components/logos/phoneflow"
import { NavMain } from "@/components/sidebar/nav-main"
import { NavUser } from "@/components/sidebar/nav-user"
import { OrganizationSwitcher } from "@/components/sidebar/organization-switcher"
import { SidebarCredits } from "@/components/sidebar/sidebar-credits"
import { env } from "@/lib/env"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenuButton size="lg" className="pointer-events-none mb-2 gap-1">
          <div className="flex aspect-square size-8 items-center justify-center">
            <PhoneflowIcon className="size-6! text-sidebar-foreground" />
          </div>
          <span className="select-none text-2xl font-medium leading-none">
            Phoneflow
          </span>
        </SidebarMenuButton>
        <OrganizationSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        {env.IS_CLOUD ? <SidebarCredits /> : null}
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
