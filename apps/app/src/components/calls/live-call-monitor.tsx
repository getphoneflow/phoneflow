import {
  RoomAudioRenderer,
  SessionProvider,
  useSession,
} from "@livekit/components-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ConnectionState, TokenSource } from "livekit-client"
import { PhoneOffIcon, Volume2Icon, VolumeXIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import type {
  EndCallResponse,
  JoinCallResponse,
} from "@workspace/shared/api/calls/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { toast } from "@workspace/ui/components/sonner"
import { Spinner } from "@workspace/ui/components/spinner"
import { VoiceAgentTranscript } from "@/components/voice-agent-transcript"
import { api } from "@/lib/api"
import { useTranslation } from "@/lib/i18n"

type LiveCallMonitorProps = {
  callId: string
  livekitRoomName: string
  onEnded: () => void
}

export function LiveCallMonitor({
  callId,
  livekitRoomName,
  onEnded,
}: LiveCallMonitorProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [endDialogOpen, setEndDialogOpen] = useState(false)

  const tokenSource = useMemo(
    () =>
      TokenSource.custom(async () => {
        const response = await api.post<JoinCallResponse, never>(
          `/calls/${callId}/join`,
          {}
        )
        return {
          serverUrl: response.server_url,
          participantToken: response.participant_token,
        }
      }),
    [callId]
  )

  const session = useSession(tokenSource, {
    roomName: livekitRoomName,
  })

  useEffect(() => {
    void session.start({
      tracks: {
        microphone: { enabled: false },
      },
    })

    return () => {
      void session.end()
    }
    // Connect for this sheet mount only.
  }, [])

  const endCallMutation = useMutation({
    mutationFn: () =>
      api.post<EndCallResponse, never>(`/calls/${callId}/end`, {}),
    onSuccess: async () => {
      setEndDialogOpen(false)
      await session.end()
      toast.success(t("components.calls.live_call_monitor.toasts.ended"))
      queryClient.invalidateQueries({ queryKey: ["calls"] })
      onEnded()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const isConnecting = session.connectionState === ConnectionState.Connecting
  const isConnected = session.isConnected

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-0 flex-1 flex-col">
        {audioEnabled && <RoomAudioRenderer />}

        {isConnected ? (
          <VoiceAgentTranscript />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {isConnecting
                ? t("components.calls.live_call_monitor.joining")
                : t("components.calls.live_call_monitor.disconnected")}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 px-4 py-4">
          <Button
            variant="outline"
            disabled={!isConnected}
            onClick={() => setAudioEnabled((enabled) => !enabled)}
          >
            {audioEnabled ? <VolumeXIcon /> : <Volume2Icon />}
            {audioEnabled
              ? t("components.calls.live_call_monitor.stop_listening")
              : t("components.calls.live_call_monitor.listen")}
          </Button>
          <Button
            variant="destructive"
            disabled={!isConnected || endCallMutation.isPending}
            onClick={() => setEndDialogOpen(true)}
          >
            <PhoneOffIcon />
            {t("components.calls.live_call_monitor.end_call")}
          </Button>
        </div>
      </div>

      <AlertDialog
        open={endDialogOpen}
        onOpenChange={(open) => {
          setEndDialogOpen(open)
          if (!open) {
            endCallMutation.reset()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("components.calls.live_call_monitor.end_dialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("components.calls.live_call_monitor.end_dialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={endCallMutation.isPending}>
              {t("common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={endCallMutation.isPending}
              onClick={() => endCallMutation.mutate()}
            >
              {endCallMutation.isPending ? (
                <Spinner className="mx-4" />
              ) : (
                t("components.calls.live_call_monitor.end_dialog.confirm")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SessionProvider>
  )
}
