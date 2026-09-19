/** @jsxRuntime automatic */
import type { ReactNode } from "react"
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  pixelBasedPreset,
  Tailwind,
} from "react-email"

interface EmailBaseProps {
  preview: string
  children: ReactNode
}

export default function EmailBase({ preview, children }: EmailBaseProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto my-10 max-w-[450px] rounded border border-gray-200 bg-white p-8">
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
