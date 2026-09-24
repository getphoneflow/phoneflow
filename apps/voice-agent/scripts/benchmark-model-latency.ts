import {
  ChatContext,
  hasResponse,
  initializeLogger,
  stt as sttNamespace,
} from "@livekit/agents"

import { getModels, pickFirstVoice } from "@workspace/shared/models/helpers"
import "@/lib/env"
import { LLM } from "@/providers/llm"
import { STT } from "@/providers/stt"
import { TTS } from "@/providers/tts"

const KINDS = ["llm", "tts", "stt"] as const
const TIMEOUT_MS = 5_000
const LLM_PROMPT = "Reply with exactly one word: OK"
const SPEAK_TEXT = "Hello, how can I help you today?"

initializeLogger({ pretty: false, level: "error" })

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms)
  })
}

async function benchLlm(modelId: string) {
  const llm = LLM({ model: modelId, maxTokens: 16 })

  let lastError: Error | undefined
  const onError = (event: { error: Error }) => {
    lastError = event.error
  }
  llm.on("error", onError)

  try {
    const chatCtx = new ChatContext()
    chatCtx.addMessage({ role: "user", content: LLM_PROMPT })

    const start = performance.now()
    let ttftMs: number | undefined

    const stream = llm.chat({
      chatCtx,
      connOptions: { maxRetry: 0, retryIntervalMs: 0, timeoutMs: TIMEOUT_MS },
    })

    for await (const chunk of stream) {
      if (ttftMs === undefined && hasResponse(chunk)) {
        ttftMs = performance.now() - start
      }
    }
    stream.close()

    if (ttftMs === undefined) throw lastError ?? new Error("empty response")
    return ttftMs
  } finally {
    llm.off("error", onError)
    await llm.aclose()
  }
}

async function synthesize(modelId: string, text: string) {
  const voice = pickFirstVoice(modelId)
  if (!voice) throw new Error("no voice")

  const tts = TTS({ model: modelId, voice, language: "en" })

  let lastError: Error | undefined
  const onError = (event: { error: Error }) => {
    lastError = event.error
  }
  tts.on("error", onError)

  try {
    const start = performance.now()
    let ttfbMs: number | undefined
    const frames = []

    for await (const event of tts.synthesize(text, {
      maxRetry: 0,
      retryIntervalMs: 0,
      timeoutMs: TIMEOUT_MS,
    })) {
      if (ttfbMs === undefined) ttfbMs = performance.now() - start
      frames.push(event.frame)
    }

    if (ttfbMs === undefined || frames.length === 0) {
      throw lastError ?? new Error("empty audio")
    }

    return { ttfbMs, frames }
  } finally {
    tts.off("error", onError)
    await tts.close()
  }
}

async function benchStt(
  modelId: string,
  frames: Awaited<ReturnType<typeof synthesize>>["frames"]
) {
  const stt = STT({ model: modelId, language: "en" })
  const stream = stt.stream({
    connOptions: { maxRetry: 0, retryIntervalMs: 0, timeoutMs: TIMEOUT_MS },
  })

  for (const frame of frames) stream.pushFrame(frame)

  const start = performance.now()
  stream.endInput()

  for await (const event of stream) {
    if (
      event.type === sttNamespace.SpeechEventType.FINAL_TRANSCRIPT ||
      event.type === sttNamespace.SpeechEventType.END_OF_SPEECH
    ) {
      return performance.now() - start
    }
  }

  throw new Error("no final transcript")
}

process.on("uncaughtException", (error) => {
  if (
    error instanceof TypeError &&
    error.message.includes("WritableStream is")
  ) {
    return
  }
  console.error(error)
  process.exit(1)
})

let sampleFrames: Awaited<ReturnType<typeof synthesize>>["frames"] | undefined

for (const kind of KINDS) {
  console.log(`\n=== ${kind.toUpperCase()} ===`)

  for (const model of getModels(kind)) {
    try {
      let latencyMs: number

      if (kind === "llm") {
        latencyMs = await Promise.race([
          benchLlm(model.id),
          timeout(TIMEOUT_MS),
        ])
      } else if (kind === "tts") {
        const result = await Promise.race([
          synthesize(model.id, SPEAK_TEXT),
          timeout(TIMEOUT_MS),
        ])
        latencyMs = result.ttfbMs
        sampleFrames ??= result.frames
      } else {
        if (!sampleFrames) throw new Error("no sample audio from TTS")
        latencyMs = await Promise.race([
          benchStt(model.id, sampleFrames),
          timeout(TIMEOUT_MS),
        ])
      }

      console.log(`${model.id}: ${Math.round(latencyMs)}ms`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`${model.id}: ${message}`)
    }
  }
}

process.exit(0)
