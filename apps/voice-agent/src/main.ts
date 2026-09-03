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
import { STT } from "@livekit/agents-plugin-assemblyai"
import { LLM } from "@livekit/agents-plugin-cerebras"
import { TTS } from "@livekit/agents-plugin-fishaudio"
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

const ANSWER_TIMEOUT_MS = 45_000

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load({
      activationThreshold: 0.3,
    })
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

    const session = new voice.AgentSession({
      vad: ctx.proc.userData.vad as silero.VAD,
      stt: new STT({
        apiKey: env.ASSEMBLYAI_API_KEY,
        baseUrl: env.ASSEMBLYAI_BASE_URL,
        speechModel: "universal-3-5-pro",
        mode: "balanced",
        vadThreshold: 0.3,
        minTurnSilence: 100,
        maxTurnSilence: 1000,
        agentContextCarryover: true,
        voiceFocus: "near-field",
      }),
      llm: new LLM({
        model: "gemma-4-31b",
        apiKey: env.CEREBRAS_API_KEY,
        temperature: 0.01,
      }),
      tts: new TTS({
        apiKey: env.FISHAUDIO_API_KEY,
        model: "s2.1-pro",
        voiceId: env.FISHAUDIO_VOICE_ID,
        latencyMode: "balanced",
      }),
      turnHandling: {
        turnDetection: "stt",
        endpointing: { minDelay: 0 },
        preemptiveGeneration: { enabled: true, preemptiveTts: true },
        interruption: {
          mode: "vad",
          minDuration: 500,
          minWords: 1,
          resumeFalseInterruption: true,
          falseInterruptionTimeout: 2000,
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
