import { Link, useMatchRoute } from "@tanstack/react-router"
import {
  HistoryIcon,
  PhoneIcon,
  PhoneOutgoingIcon,
  SettingsIcon,
  UsersIcon,
  WorkflowIcon,
} from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"

const nav = {
  top: [
    {
      title: "Build",
      items: [
        {
          title: "Agents",
          url: "/agents",
          icon: <WorkflowIcon />,
        },
      ],
    },
    {
      title: "Deploy",
      items: [
        {
          title: "Phone numbers",
          url: "/phone-numbers",
          icon: <PhoneIcon />,
        },
        {
          title: "Batch calls",
          url: "/batch-calls",
          icon: <PhoneOutgoingIcon />,
        },
      ],
    },
    {
      title: "Monitor",
      items: [
        {
          title: "Calls",
          url: "/calls",
          icon: <HistoryIcon />,
        },
        {
          title: "Contacts",
          url: "/contacts",
          icon: <UsersIcon />,
        },
      ],
    },
  ],
  bottom: [
    {
      title: "Platform",
      items: [
        {
          title: "Settings",
          url: "/settings",
          icon: <SettingsIcon />,
        },
      ],
    },
  ],
}

export function NavMain() {
  const matchRoute = useMatchRoute()

  return (
    <div className="flex flex-1 flex-col">
      {[nav.top, nav.bottom].map((sections, index) => (
        <div key={index} className={index ? "mt-auto" : undefined}>
          {sections.map((section) => (
            <SidebarGroup key={section.title}>
              <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={
                        !!matchRoute({ to: item.url, fuzzy: item.url !== "/" })
                      }
                      render={<Link to={item.url} />}
                    >
                      {item.icon}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </div>
      ))}
    </div>
  )
}
