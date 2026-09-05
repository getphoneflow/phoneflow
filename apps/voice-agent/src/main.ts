import { fileURLToPath } from "node:url"
import {
  cli,
  defineAgent,
  type JobContext,
  type JobProcess,
  ServerOptions,
  voice,
  waitForParticipantAttribute,
} from "@livekit/agents"
import * as silero from "@livekit/agents-plugin-silero"

import { BACKGROUND_AUDIO } from "@workspace/shared/constants/background-audio"
import { FlowAgent } from "@/flow/agent"
import { buildFlowGraph } from "@/flow/builder"
import { createVariables } from "@/flow/variables"
import {
  completeCall,
  parseDispatchMetadata,
  recordUnansweredCall,
  startCall,
} from "@/lib/calls"
import { env } from "@/lib/env"
import { buildCallTranscript } from "@/lib/transcript"
import { LLM } from "@/providers/llm"
import { STT } from "@/providers/stt"
import { TTS } from "@/providers/tts"

const ANSWER_TIMEOUT_MS = 45_000

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load()
  },
  entry: async (ctx: JobContext) => {
    await ctx.connect()

    const metadata = parseDispatchMetadata(ctx.job.metadata)
    const participant = await ctx.waitForParticipant()
    const livekitRoomName = ctx.room.name ?? ""

    if (metadata.direction === "outbound") {
      try {
        await waitForParticipantAttribute({
          room: ctx.room,
          identity: participant.identity,
          attribute: "sip.callStatus",
          value: "active",
          signal: AbortSignal.timeout(ANSWER_TIMEOUT_MS),
        })
      } catch {
        await ctx.deleteRoom()
        await recordUnansweredCall(metadata, livekitRoomName)
        return
      }
    }

    const { callId, config } = await startCall(
      participant.attributes,
      metadata,
      livekitRoomName
    )

    const flowGraph = buildFlowGraph(config)
    const variables = createVariables(
      participant.attributes,
      config.timezone ?? "UTC"
    )

    const turn = config.turnHandling
    const session = new voice.AgentSession({
      vad: ctx.proc.userData.vad as silero.VAD,
      stt: STT(config.stt),
      llm: LLM(config.llm),
      tts: TTS(config.tts),
      keytermsOptions: config.keytermsOptions,
      turnHandling: {
        turnDetection: turn?.turnDetection ?? "vad",
        endpointing: {
          mode: turn?.endpointing?.mode ?? "fixed",
          minDelay: turn?.endpointing?.minDelay ?? 500,
          maxDelay: turn?.endpointing?.maxDelay ?? 3000,
          alpha: turn?.endpointing?.alpha ?? 0.9,
        },
        preemptiveGeneration: {
          enabled: turn?.preemptiveGeneration?.enabled ?? true,
          preemptiveTts: turn?.preemptiveGeneration?.preemptiveTts ?? false,
          maxSpeechDuration:
            turn?.preemptiveGeneration?.maxSpeechDuration ?? 10_000,
          maxRetries: turn?.preemptiveGeneration?.maxRetries ?? 3,
        },
        interruption: {
          mode: "vad",
          enabled: turn?.interruption?.enabled ?? true,
          discardAudioIfUninterruptible:
            turn?.interruption?.discardAudioIfUninterruptible ?? true,
          minDuration: turn?.interruption?.minDuration ?? 500,
          minWords: turn?.interruption?.minWords ?? 0,
          falseInterruptionTimeout:
            turn?.interruption?.falseInterruptionTimeout ?? 2000,
          resumeFalseInterruption:
            turn?.interruption?.resumeFalseInterruption ?? true,
        },
      },
    })

    ctx.room.on("participantDisconnected", (remoteParticipant) => {
      if (remoteParticipant.identity === participant.identity) {
        completeCall(
          callId,
          "completed",
          buildCallTranscript(session.history),
          variables.snapshot()
        )
      }
    })

    await session.start({
      agent: new FlowAgent(flowGraph, variables),
      room: ctx.room,
      record: false,
    })

    if (config.backgroundAudio) {
      const backgroundAudio = new voice.BackgroundAudioPlayer({
        ambientSound: {
          source: BACKGROUND_AUDIO[config.backgroundAudio.sound].source,
          volume: config.backgroundAudio.volume,
        },
      })

      await backgroundAudio.start({ room: ctx.room, agentSession: session })
    }
  },
})

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: env.LIVEKIT_AGENT_NAME,
    apiKey: env.LIVEKIT_API_KEY,
    apiSecret: env.LIVEKIT_API_SECRET,
    wsURL: env.LIVEKIT_URL,
  })
)
