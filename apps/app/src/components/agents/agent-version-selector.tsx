import { useIsFetching } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Spinner } from "@workspace/ui/components/spinner"
import { formatAgentVersionLabel } from "@/components/helpers"
import { UserDateTime } from "@/components/user-timezone-provider"
import { useAgentStore } from "@/stores/agent"

export function AgentVersionSelector() {
  const navigate = useNavigate()
  const agent = useAgentStore((state) => state.agent)
  const activeVersionNumber = useAgentStore(
    (state) => state.activeVersionNumber
  )
  const isFetchingVersion =
    useIsFetching({
      queryKey: ["agents", "version-config", agent.id],
    }) > 0

  const draftVersionNumber =
    agent.versions.length > 0
      ? Math.max(...agent.versions.map((version) => version.number)) + 1
      : 1
  const isDraftSelected = activeVersionNumber === null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button
          variant="outline"
          className="w-28 justify-between"
          disabled={isFetchingVersion}
        >
          {isFetchingVersion ? (
            <Spinner className="mx-auto" />
          ) : (
            <>
              <div>
                V{isDraftSelected ? draftVersionNumber : activeVersionNumber}
                {isDraftSelected ? " (Draft)" : null}
              </div>
              <ChevronDownIcon />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-120 w-65">
        <DropdownMenuItem
          onClick={() => {
            navigate({
              to: "/agents/$agentId",
              params: { agentId: agent.id },
              search: (prev) => ({ ...prev, agentVersionId: undefined }),
            })
          }}
        >
          <div className="min-w-0 flex-1">
            <div className="truncate">V{draftVersionNumber} (Draft)</div>
            <div className="truncate text-xs text-muted-foreground">
              Updated <UserDateTime value={agent.updatedAt} />
            </div>
          </div>
          <CheckIcon className={isDraftSelected ? undefined : "invisible"} />
        </DropdownMenuItem>

        {agent.versions.map((version) => {
          const isSelected = activeVersionNumber === version.number

          return (
            <DropdownMenuItem
              key={version.id}
              onClick={() => {
                if (!isSelected) {
                  navigate({
                    to: "/agents/$agentId",
                    params: { agentId: agent.id },
                    search: (prev) => ({
                      ...prev,
                      agentVersionId: version.id,
                    }),
                  })
                }
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate">
                  {formatAgentVersionLabel(version)}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  Published <UserDateTime value={version.publishedAt} />
                </div>
              </div>
              <CheckIcon className={isSelected ? undefined : "invisible"} />
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
