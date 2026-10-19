import { isIP } from "node:net"
import { tool } from "@livekit/agents"
import { z } from "zod"

import type { WebhookTool } from "@workspace/shared/api/agent-config/types"
import type { Variables } from "@/flow/variables"

const LLM_RESULT_LIMIT = 15_000
const RESPONSE_READ_LIMIT = 1_000_000
const BODY_METHODS = new Set<WebhookTool["method"]>(["POST", "PUT", "PATCH"])
const PLACEHOLDER = /\{\{\s*([a-z0-9_]+)\s*\}\}/g
const EXACT_PLACEHOLDER = /^\{\{\s*([a-z0-9_]+)\s*\}\}$/
const PLAIN_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/

class WebhookRequestError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean
  ) {
    super(message)
    this.name = "WebhookRequestError"
  }
}

function assertHttpsUrl(url: URL) {
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase()
  if (
    url.protocol !== "https:" ||
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    isIP(hostname)
  ) {
    throw new WebhookRequestError("Webhook failed: URL is not allowed", false)
  }
}

function stringifyVariable(value: unknown) {
  if (value == null) {
    return undefined
  }
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return JSON.stringify(value)
}

function fill(
  text: string,
  args: Record<string, unknown>,
  variables: Variables
) {
  const withArgs = text.replace(PLACEHOLDER, (match, key: string) => {
    const value = stringifyVariable(args[key])
    return value === undefined ? match : value
  })
  return variables.replace(withArgs)
}

function fillBody(
  text: string,
  args: Record<string, unknown>,
  variables: Variables
) {
  function resolve(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => resolve(entry))
    }
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          fill(key, args, variables),
          resolve(entry),
        ])
      )
    }
    if (typeof value !== "string") {
      return value
    }

    const key = value.match(EXACT_PLACEHOLDER)?.[1]
    if (key) {
      const arg = args[key]
      if (typeof arg === "number" && Number.isFinite(arg)) {
        return arg
      }
      if (arg != null) {
        return stringifyVariable(arg)
      }
      const variable = variables.get(key)
      if (variable !== undefined && PLAIN_NUMBER.test(variable)) {
        return Number(variable)
      }
    }

    return fill(value, args, variables)
  }

  try {
    return JSON.stringify(resolve(JSON.parse(text)))
  } catch {
    return fill(text, args, variables)
  }
}

export function createWebhookTool(
  definition: WebhookTool,
  variables: Variables
) {
  const shape: Record<string, z.ZodType> = {}

  for (const parameter of definition.parameters) {
    let field: z.ZodType =
      parameter.type === "number"
        ? z.number()
        : parameter.type === "boolean"
          ? z.boolean()
          : z.string()

    const description = variables.replace(parameter.description).trim()
    if (description) {
      field = field.describe(description)
    }
    if (!parameter.required) {
      field = field.optional()
    }

    shape[parameter.name] = field
  }

  return tool({
    name: definition.name,
    description: variables.replace(definition.description),
    parameters: z.object(shape),
    execute: async (args) => {
      let lastError = "Webhook failed"

      for (let attempt = 0; attempt <= definition.maxRetries; attempt++) {
        try {
          return await requestWebhook(definition, variables, args)
        } catch (error) {
          const retryable =
            error instanceof WebhookRequestError ? error.retryable : true
          lastError = error instanceof Error ? error.message : "Webhook failed"
          if (!retryable || attempt === definition.maxRetries) {
            break
          }
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(4000, 200 * 2 ** attempt))
          )
        }
      }

      return lastError
    },
  })
}

async function requestWebhook(
  tool: WebhookTool,
  variables: Variables,
  args: Record<string, unknown>
) {
  let url: URL
  try {
    url = new URL(fill(tool.url, args, variables))
  } catch {
    throw new WebhookRequestError("Webhook failed: invalid URL", false)
  }

  const headers = new Headers()
  for (const header of tool.headers) {
    const key = fill(header.key, args, variables).trim()
    if (key) {
      headers.set(key, fill(header.value, args, variables))
    }
  }

  for (const parameter of tool.queryParameters) {
    const key = fill(parameter.key, args, variables).trim()
    if (key) {
      url.searchParams.append(key, fill(parameter.value, args, variables))
    }
  }

  let requestBody: string | undefined
  const bodyText = tool.body.trim()
  if (BODY_METHODS.has(tool.method) && bodyText) {
    requestBody = fillBody(bodyText, args, variables)
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json")
    }
  }

  assertHttpsUrl(url)
  const response = await fetch(url, {
    method: tool.method,
    headers,
    body: requestBody,
    signal: AbortSignal.timeout(tool.timeoutMs),
  })
  const body = (await response.text()).slice(0, RESPONSE_READ_LIMIT)

  if (!response.ok) {
    const snippet = body.slice(0, 500)
    throw new WebhookRequestError(
      `Webhook failed: ${response.status} ${response.statusText}${snippet ? `: ${snippet}` : ""}`,
      true
    )
  }

  storeResponseVariables(tool, variables, body)
  return body.slice(0, LLM_RESULT_LIMIT)
}

function storeResponseVariables(
  tool: WebhookTool,
  variables: Variables,
  body: string
) {
  function getByPath(value: unknown, path: string) {
    let current = value
    for (const token of path.split(/[.[\]]+/).filter(Boolean)) {
      if (current === null || typeof current !== "object") {
        return undefined
      }
      current = (current as Record<string, unknown>)[
        Array.isArray(current) ? Number(token) : token
      ]
    }
    return current
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return
  }
  if (parsed === null || typeof parsed !== "object") {
    return
  }

  for (const variable of tool.responseVariables) {
    const value = stringifyVariable(getByPath(parsed, variable.path))
    if (value !== undefined) {
      variables.set(variable.name, value)
    }
  }
}
