import { Link, useMatchRoute } from "@tanstack/react-router"
import {
  HistoryIcon,
  PhoneIcon,
  PhoneOffIcon,
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
import { useTranslation } from "@/lib/i18n"

const nav = {
  top: [
    {
      title: "components.sidebar.nav_main.sections.build",
      items: [
        {
          title: "components.sidebar.nav_main.items.agents",
          url: "/agents",
          icon: <WorkflowIcon />,
        },
      ],
    },
    {
      title: "components.sidebar.nav_main.sections.deploy",
      items: [
        {
          title: "components.sidebar.nav_main.items.phone_numbers",
          url: "/phone-numbers",
          icon: <PhoneIcon />,
        },
        {
          title: "components.sidebar.nav_main.items.batch_calls",
          url: "/batch-calls",
          icon: <PhoneOutgoingIcon />,
        },
      ],
    },
    {
      title: "components.sidebar.nav_main.sections.monitor",
      items: [
        {
          title: "components.sidebar.nav_main.items.calls",
          url: "/calls",
          icon: <HistoryIcon />,
        },
        {
          title: "components.sidebar.nav_main.items.contacts",
          url: "/contacts",
          icon: <UsersIcon />,
        },
        {
          title: "components.sidebar.nav_main.items.do_not_call",
          url: "/do-not-call",
          icon: <PhoneOffIcon />,
        },
      ],
    },
  ],
  bottom: [
    {
      title: "components.sidebar.nav_main.sections.platform",
      items: [
        {
          title: "components.sidebar.nav_main.items.settings",
          url: "/settings",
          icon: <SettingsIcon />,
        },
      ],
    },
  ],
}

export function NavMain() {
  const { t } = useTranslation()
  const matchRoute = useMatchRoute()

  return (
    <div className="flex flex-1 flex-col">
      {[nav.top, nav.bottom].map((sections, index) => (
        <div key={index} className={index ? "mt-auto" : undefined}>
          {sections.map((section) => (
            <SidebarGroup key={section.title}>
              <SidebarGroupLabel>{t(section.title)}</SidebarGroupLabel>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={t(item.title)}
                      isActive={
                        !!matchRoute({ to: item.url, fuzzy: item.url !== "/" })
                      }
                      render={<Link to={item.url} />}
                    >
                      {item.icon}
                      <span>{t(item.title)}</span>
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
