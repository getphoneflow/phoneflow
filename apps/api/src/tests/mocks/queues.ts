import { vi } from "vitest"

import type * as queues from "@/lib/queues"

type Queue = typeof queues.emailsQueue

// Records jobs instead of sending them to Redis
function queue(name: string) {
  return {
    name,
    add: vi.fn<Queue["add"]>(
      async (jobName, data, opts) =>
        ({ id: crypto.randomUUID(), name: jobName, data, opts }) as never
    ),
  }
}

export const emailsQueue = queue("emails")
export const batchCallsQueue = queue("batch-calls")
export const knowledgeDocumentsQueue = queue("knowledge-documents")
