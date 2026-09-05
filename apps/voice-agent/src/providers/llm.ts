import type { llm } from "@livekit/agents"
import * as anthropic from "@livekit/agents-plugin-anthropic"
import * as cerebras from "@livekit/agents-plugin-cerebras"
import * as google from "@livekit/agents-plugin-google"
import * as mistralai from "@livekit/agents-plugin-mistralai"
import * as openai from "@livekit/agents-plugin-openai"

import type { AgentConfig } from "@workspace/shared/api/agent-config/types"
import { env } from "@/lib/env"

export function LLM(config: AgentConfig["llm"]): llm.LLM {
  const slash = config.model.indexOf("/")
  if (slash === -1) {
    throw new Error(`Invalid LLM model "${config.model}"`)
  }

  const provider = config.model.slice(0, slash)
  const model = config.model.slice(slash + 1)

  switch (provider) {
    case "anthropic":
      return new anthropic.LLM({
        model,
        apiKey: env.ANTHROPIC_API_KEY,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        toolChoice: config.toolChoice,
      })
    case "baseten":
      return new openai.LLM({
        model,
        apiKey: env.BASETEN_API_KEY,
        baseURL: "https://inference.baseten.co/v1",
        temperature: config.temperature,
        maxCompletionTokens: config.maxTokens,
        toolChoice: config.toolChoice,
        reasoningEffort: config.reasoningEffort,
      })
    case "cerebras":
      return new cerebras.LLM({
        model,
        apiKey: env.CEREBRAS_API_KEY,
        temperature: config.temperature,
        toolChoice: config.toolChoice,
      })
    case "deepinfra":
      return new openai.LLM({
        model,
        apiKey: env.DEEPINFRA_API_KEY,
        baseURL: "https://api.deepinfra.com/v1/openai",
        temperature: config.temperature,
        maxCompletionTokens: config.maxTokens,
        toolChoice: config.toolChoice,
        reasoningEffort: config.reasoningEffort,
      })
    case "deepseek":
      return openai.LLM.withDeepSeek({
        model,
        apiKey: env.DEEPSEEK_API_KEY,
        temperature: config.temperature,
      })
    case "fireworks":
      return openai.LLM.withFireworks({
        model,
        apiKey: env.FIREWORKS_API_KEY,
        temperature: config.temperature,
        maxCompletionTokens: config.maxTokens,
        toolChoice: config.toolChoice,
        reasoningEffort: config.reasoningEffort,
      })
    case "google":
      return new google.LLM({
        model,
        apiKey: env.GOOGLE_API_KEY,
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
        toolChoice: config.toolChoice,
      })
    case "groq":
      return openai.LLM.withGroq({
        model,
        apiKey: env.GROQ_API_KEY,
        temperature: config.temperature,
      })
    case "mistral":
      return new mistralai.LLM({
        model,
        apiKey: env.MISTRAL_API_KEY,
        temperature: config.temperature,
      })
    case "openai":
      return new openai.responses.LLM({
        model,
        apiKey: env.OPENAI_API_KEY,
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
        toolChoice: config.toolChoice,
        reasoning: config.reasoningEffort
          ? { effort: config.reasoningEffort }
          : undefined,
      })
    case "ovhcloud":
      return openai.LLM.withOVHcloud({
        model,
        apiKey: env.OVHCLOUD_API_KEY,
        temperature: config.temperature,
        maxCompletionTokens: config.maxTokens,
        toolChoice: config.toolChoice,
        reasoningEffort: config.reasoningEffort,
      })
    case "perplexity":
      return openai.LLM.withPerplexity({
        model,
        apiKey: env.PERPLEXITY_API_KEY,
        temperature: config.temperature,
      })
    case "together":
      return openai.LLM.withTogether({
        model,
        apiKey: env.TOGETHER_API_KEY,
        temperature: config.temperature,
      })
    case "xai":
      return openai.LLM.withXAI({
        model,
        apiKey: env.XAI_API_KEY,
        temperature: config.temperature,
      })
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`)
  }
}
