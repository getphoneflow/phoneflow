import {
  RoomAudioRenderer,
  SessionProvider,
  useSession,
} from "@livekit/components-react"
import { ConnectionState, TokenSource } from "livekit-client"
import { PhoneIcon, PhoneOffIcon } from "lucide-react"
import type { ReactNode } from "react"

import type { CallVariableValues } from "@workspace/shared/api/calls/types"
import { Button } from "@workspace/ui/components/button"
import { captureEvent } from "@/lib/analytics"
import { env } from "@/lib/env"

const tokenSource = TokenSource.endpoint(`${env.API_URL}/api/token`, {
  credentials: "include",
})

type VoiceAgentClientProps = {
  agentId: string
  agentVersionId?: string
  variableValues?: CallVariableValues
  preCallContent?: ReactNode
  children: ReactNode
}

export function VoiceAgentClient({
  agentId,
  agentVersionId,
  variableValues = {},
  preCallContent,
  children,
}: VoiceAgentClientProps) {
  const session = useSession(tokenSource, {
    agentName: env.LIVEKIT_AGENT_NAME,
    participantAttributes: {
      agent_id: agentId,
      agent_version_id: agentVersionId ?? "",
      variable_values: JSON.stringify(variableValues),
    },
  })

  async function handleConnect() {
    await session.start()
    captureEvent("call_started", {
      channel: "web_call",
      agent_id: agentId,
      agent_version_id: agentVersionId ?? null,
    })
  }

  async function handleDisconnect() {
    await session.end()
  }

  const isConnected = session.isConnected
  const isConnecting = session.connectionState === ConnectionState.Connecting

  return (
    <SessionProvider session={session}>
      {isConnected ? (
        <div className="flex h-full flex-col">
          <RoomAudioRenderer />
          {children}
          <div className="pb-8 pt-4 mx-auto">
            <Button variant="destructive" onClick={handleDisconnect}>
              <PhoneOffIcon />
              End call
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col p-4">
          {preCallContent}
          <div className="flex flex-1 items-center justify-center">
            <Button onClick={handleConnect} disabled={isConnecting}>
              <PhoneIcon />
              {isConnecting ? "Calling..." : "Start call"}
            </Button>
          </div>
        </div>
      )}
    </SessionProvider>
  )
}
