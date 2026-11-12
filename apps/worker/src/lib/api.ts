import { ApiError } from "@/lib/api-error"
import { env } from "@/lib/env"

type RequestOptions<TBody = never> = {
  headers?: HeadersInit
  body?: TBody
}

async function request<TResponse, TBody = never>(
  method: string,
  path: string,
  options?: RequestOptions<TBody>
): Promise<TResponse> {
  const headers = new Headers(options?.headers)
  headers.set("Authorization", `Bearer ${env.API_TOKEN}`)
  if (options?.body !== undefined) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(`${env.API_URL}/api${path}`, {
    ...options,
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  const body = await response.json()

  if (!response.ok) {
    throw new ApiError(body.error || String(response.status), response.status)
  }

  return body as TResponse
}

export const api = {
  get<TResponse>(path: string) {
    return request<TResponse>("GET", path)
  },
  post<TResponse, TBody>(path: string, options: RequestOptions<TBody>) {
    return request<TResponse, TBody>("POST", path, options)
  },
  patch<TResponse, TBody>(path: string, options: RequestOptions<TBody>) {
    return request<TResponse, TBody>("PATCH", path, options)
  },
}
