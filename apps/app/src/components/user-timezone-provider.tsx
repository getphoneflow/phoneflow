import { useSuspenseQuery } from "@tanstack/react-query"
import { createContext, useContext } from "react"

import { sessionQueryOptions } from "@/lib/auth/session"
import { formatDateTime } from "@/lib/time"

const UserTimeZoneContext = createContext("UTC")

export function UserTimeZoneProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSuspenseQuery(sessionQueryOptions())

  return (
    <UserTimeZoneContext.Provider value={session!.user.timezone}>
      {children}
    </UserTimeZoneContext.Provider>
  )
}

export function useUserTimeZone() {
  return useContext(UserTimeZoneContext)
}

export function UserDateTime({ value }: { value: string | Date | number }) {
  return formatDateTime(value, useUserTimeZone())
}
