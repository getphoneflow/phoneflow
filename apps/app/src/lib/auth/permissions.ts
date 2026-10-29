import { useSuspenseQuery } from "@tanstack/react-query"

import { organization } from "@/lib/auth/client"

type PermissionCheck = Record<string, string[]>

export function useCheckPermission(permissions: PermissionCheck) {
  const { data } = useSuspenseQuery({
    queryKey: ["has-permission", permissions],
    queryFn: async () => {
      const { data } = await organization.hasPermission({ permissions })
      return data?.success ?? false
    },
    staleTime: 1000 * 60,
  })

  return data
}
