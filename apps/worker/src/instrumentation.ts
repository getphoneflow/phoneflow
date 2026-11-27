import "dotenv/config"

import { HttpInstrumentation } from "@opentelemetry/instrumentation-http"
import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino"
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node"
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici"
import {
  hostDetector,
  resourceAttributesEnvDetector,
  resourceFromAttributes,
} from "@opentelemetry/resources"
import { NodeSDK } from "@opentelemetry/sdk-node"
import { ParentBasedSampler, SamplingDecision } from "@opentelemetry/sdk-trace"

export const sdk = new NodeSDK({
  serviceName: "worker",
  resource: resourceFromAttributes({
    "service.version": process.env.GIT_SHA,
  }),
  resourceDetectors: [resourceAttributesEnvDetector, hostDetector],
  sampler: new ParentBasedSampler({
    root: {
      shouldSample: (_context, _traceId, spanName) => ({
        decision:
          /^(getNextJob|moveStalledJobsToWait|startStalledCheckTimer) /.test(
            spanName
          )
            ? SamplingDecision.NOT_RECORD
            : SamplingDecision.RECORD_AND_SAMPLED,
      }),
    },
  }),
  instrumentations: [
    new HttpInstrumentation({ requireParentforOutgoingSpans: true }),
    new UndiciInstrumentation({ requireParentforSpans: true }),
    new RuntimeNodeInstrumentation(),
    new PinoInstrumentation(),
  ],
})

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  sdk.start()
}
