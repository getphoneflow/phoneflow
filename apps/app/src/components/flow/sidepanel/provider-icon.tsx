import { cn } from "cn"
import type { ComponentType, SVGProps } from "react"

import { AnthropicIcon } from "@/components/logos/anthropic"
import { AssemblyIcon } from "@/components/logos/assembly"
import { BasetenIcon } from "@/components/logos/baseten"
import { CartesiaIcon } from "@/components/logos/cartesia"
import { CerebrasIcon } from "@/components/logos/cerebras"
import { DeepgramIcon } from "@/components/logos/deepgram"
import { DeepinfraIcon } from "@/components/logos/deepinfra"
import { DeepSeekIcon } from "@/components/logos/deepseek"
import { ElevenLabsIcon } from "@/components/logos/elevenlabs"
import { FireworksIcon } from "@/components/logos/fireworks"
import { FishAudioIcon } from "@/components/logos/fishaudio"
import { GeminiIcon } from "@/components/logos/gemini"
import { GroqIcon } from "@/components/logos/groq"
import { InworldIcon } from "@/components/logos/inworld"
import { MistralIcon } from "@/components/logos/mistral"
import { OpenAIIcon } from "@/components/logos/openai"
import { OvhcloudIcon } from "@/components/logos/ovhcloud"
import { PerplexityIcon } from "@/components/logos/perplexity"
import { SonioxIcon } from "@/components/logos/sonoix"
import { TogetherIcon } from "@/components/logos/together"
import { XaiIcon } from "@/components/logos/xai"

const PROVIDER_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  anthropic: AnthropicIcon,
  assemblyai: AssemblyIcon,
  baseten: BasetenIcon,
  cartesia: CartesiaIcon,
  cerebras: CerebrasIcon,
  deepgram: DeepgramIcon,
  deepinfra: DeepinfraIcon,
  deepseek: DeepSeekIcon,
  elevenlabs: ElevenLabsIcon,
  fireworks: FireworksIcon,
  fishaudio: FishAudioIcon,
  google: GeminiIcon,
  groq: GroqIcon,
  inworld: InworldIcon,
  mistral: MistralIcon,
  openai: OpenAIIcon,
  ovhcloud: OvhcloudIcon,
  perplexity: PerplexityIcon,
  soniox: SonioxIcon,
  together: TogetherIcon,
  xai: XaiIcon,
}

export function ProviderIcon({
  providerId,
  className,
}: {
  providerId: string
  className?: string
}) {
  const Icon = PROVIDER_ICONS[providerId]

  return (
    <Icon aria-hidden className={cn("size-5 text-foreground", className)} />
  )
}
