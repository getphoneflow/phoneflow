import "dotenv/config"

import { HttpInstrumentation } from "@opentelemetry/instrumentation-http"
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg"
import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino"
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node"
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici"
import {
  hostDetector,
  resourceAttributesEnvDetector,
  resourceFromAttributes,
} from "@opentelemetry/resources"
import { NodeSDK } from "@opentelemetry/sdk-node"

export const sdk = new NodeSDK({
  serviceName: "api",
  resource: resourceFromAttributes({
    "service.version": process.env.GIT_SHA,
  }),
  resourceDetectors: [resourceAttributesEnvDetector, hostDetector],
  instrumentations: [
    new HttpInstrumentation({ disableIncomingRequestInstrumentation: true }),
    new UndiciInstrumentation(),
    new PgInstrumentation({
      ignoreConnectSpans: true,
      requireParentSpan: true,
    }),
    new RuntimeNodeInstrumentation(),
    new PinoInstrumentation(),
  ],
})

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  sdk.start()
}
