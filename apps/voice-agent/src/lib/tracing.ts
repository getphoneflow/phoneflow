import { telemetry } from "@livekit/agents"
import type { Attributes } from "@opentelemetry/api"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { resourceFromAttributes } from "@opentelemetry/resources"
import {
  BatchSpanProcessor,
  NodeTracerProvider,
} from "@opentelemetry/sdk-trace-node"

export function setupTracing(metadata?: Attributes) {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return

  const fanout = new telemetry.FanoutSpanProcessor()
  const traceProvider = new NodeTracerProvider({
    resource: resourceFromAttributes({ "service.name": "voice-agent" }),
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter()), fanout],
  })

  traceProvider.register()
  telemetry.setTracerProvider(traceProvider, {
    metadata,
    registerSpanProcessor: (processor) => fanout.add(processor),
  })

  return traceProvider
}
