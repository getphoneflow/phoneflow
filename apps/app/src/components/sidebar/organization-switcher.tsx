import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react"
import { Suspense, useState } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { toast } from "@workspace/ui/components/sonner"
import { captureEvent } from "@/lib/analytics"
import { organization } from "@/lib/auth/client"
import {
  fullOrganizationQueryOptions,
  organizationsListQueryOptions,
} from "@/lib/auth/organization"
import { CreateOrganizationDialog } from "./create-organization-dialog"

function OrganizationSwitcherSkeleton() {
  return <Skeleton className="h-12 w-full" />
}

export function OrganizationSwitcher() {
  return (
    <Suspense fallback={<OrganizationSwitcherSkeleton />}>
      <OrganizationSwitcherContent />
    </Suspense>
  )
}

function OrganizationSwitcherContent() {
  const { isMobile } = useSidebar()
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const { data: activeOrganization } = useSuspenseQuery(
    fullOrganizationQueryOptions()
  )
  const { data: organizations } = useSuspenseQuery(
    organizationsListQueryOptions()
  )

  const setActiveMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const result = await organization.setActive({ organizationId })
      if (result.error) {
        throw new Error(result.error.message)
      }
      return organizationId
    },
    onSuccess: async (organizationId) => {
      captureEvent("organization_switched", {
        organization_id: organizationId,
      })
      await queryClient.refetchQueries({ type: "active" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (!activeOrganization) {
    return <OrganizationSwitcherSkeleton />
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              {activeOrganization.name[0]?.toUpperCase()}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {activeOrganization.name}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Organizations
              </DropdownMenuLabel>
              {organizations?.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => setActiveMutation.mutate(org.id)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                    {org.name[0]?.toUpperCase()}
                  </div>
                  {org.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => setCreateDialogOpen(true)}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <PlusIcon className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">
                  Add organization
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <CreateOrganizationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </SidebarMenu>
  )
}
