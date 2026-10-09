import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import {
  CheckIcon,
  ChevronsUpDownIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react"
import { Suspense } from "react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { useTheme } from "@/components/theme-provider"
import { resetAnalytics } from "@/lib/analytics"
import { signOut } from "@/lib/auth/client"
import { sessionQueryOptions } from "@/lib/auth/session"

function NavUserSkeleton() {
  return <Skeleton className="h-12 w-full" />
}

export function NavUser() {
  return (
    <Suspense fallback={<NavUserSkeleton />}>
      <NavUserContent />
    </Suspense>
  )
}

function NavUserContent() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const { data: session } = useSuspenseQuery(sessionQueryOptions())

  if (!session) {
    return <NavUserSkeleton />
  }

  const user = {
    name: session.user.name,
    email: session.user.email,
    avatar: session.user.image ?? "",
    initials: session.user.name?.[0]?.toUpperCase(),
  }

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: async () => {
          resetAnalytics()
          queryClient.clear()
          navigate({ to: "/signin" })
        },
        onError: (ctx) => {
          toast.error(ctx.error.message)
        },
      },
    })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar>
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight text-foreground">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {theme === "light" && <SunIcon />}
                {theme === "dark" && <MoonIcon />}
                {theme === "system" && <MonitorIcon />}
                Theme
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-30">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <SunIcon />
                    Light
                    {theme === "light" && <CheckIcon className="ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <MoonIcon />
                    Dark
                    {theme === "dark" && <CheckIcon className="ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <MonitorIcon />
                    System
                    {theme === "system" && <CheckIcon className="ml-auto" />}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOutIcon />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
