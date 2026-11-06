import { env } from "@/lib/env"

type RequestOptions<TBody = never> = {
  headers?: HeadersInit
  body?: TBody
  signal?: AbortSignal
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
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

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(body?.error || String(response.status), response.status)
  }

  return (await response.json()) as TResponse
}
export const api = {
  get<TResponse>(path: string) {
    return request<TResponse>("GET", path)
  },
  post<TResponse, TBody>(path: string, options: RequestOptions<TBody>) {
    return request<TResponse, TBody>("POST", path, options)
  },
}
