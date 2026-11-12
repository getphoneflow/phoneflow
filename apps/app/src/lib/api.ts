import { env } from "@/lib/env"
import i18n from "@/lib/i18n"

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
  headers.set("Accept-Language", i18n.language)
  if (options?.body !== undefined) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(`${env.API_URL}/api${path}`, {
    ...options,
    credentials: "include",
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  const body = await response.json()

  if (!response.ok) {
    throw new Error(body.error || response.status)
  }

  return body as TResponse
}

export const api = {
  get<TResponse>(path: string, options?: Omit<RequestOptions, "body">) {
    return request<TResponse>("GET", path, options)
  },
  post<TResponse, TBody>(path: string, options: RequestOptions<TBody>) {
    return request<TResponse, TBody>("POST", path, options)
  },
  put<TResponse, TBody>(path: string, options: RequestOptions<TBody>) {
    return request<TResponse, TBody>("PUT", path, options)
  },
  patch<TResponse, TBody>(path: string, options: RequestOptions<TBody>) {
    return request<TResponse, TBody>("PATCH", path, options)
  },
  delete<TResponse>(path: string, options?: Omit<RequestOptions, "body">) {
    return request<TResponse>("DELETE", path, options)
  },
  async download(path: string) {
    const headers = new Headers()
    headers.set("Accept-Language", i18n.language)
    const response = await fetch(`${env.API_URL}/api${path}`, {
      credentials: "include",
      headers,
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.error || response.status)
    }
    return response
  },
  async upload<TResponse>(path: string, body: FormData): Promise<TResponse> {
    const headers = new Headers()
    headers.set("Accept-Language", i18n.language)
    const response = await fetch(`${env.API_URL}/api${path}`, {
      method: "POST",
      credentials: "include",
      headers,
      body,
    })
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error || response.status)
    }
    return payload as TResponse
  },
}
