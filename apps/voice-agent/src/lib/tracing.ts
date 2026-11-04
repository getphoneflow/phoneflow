import { telemetry } from "@livekit/agents"
import type { Attributes } from "@opentelemetry/api"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import {
  BatchSpanProcessor,
  NodeTracerProvider,
} from "@opentelemetry/sdk-trace-node"

export function setupTracing(metadata?: Attributes) {
  if (process.env.NODE_ENV !== "production") return

  const fanout = new telemetry.FanoutSpanProcessor()
  const traceProvider = new NodeTracerProvider({
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter()), fanout],
  })

  traceProvider.register()
  telemetry.setTracerProvider(traceProvider, {
    metadata,
    registerSpanProcessor: (processor) => fanout.add(processor),
  })

  return traceProvider
}
