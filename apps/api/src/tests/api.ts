import app from "@/api"

type ApiOptions = {
  headers?: HeadersInit
}

type RequestOptions = {
  headers?: HeadersInit
  body?: unknown
}

export type ApiResponse = {
  status: number
  // biome-ignore lint/suspicious/noExplicitAny: tests read whatever the route returns
  body: any
}

export type Api = ReturnType<typeof createApi>

// Sends the request to the app in-process, without opening a port
async function request(
  method: string,
  path: string,
  api: ApiOptions,
  options: RequestOptions = {}
): Promise<ApiResponse> {
  const headers = new Headers(api.headers)
  for (const [name, value] of new Headers(options.headers)) {
    headers.set(name, value)
  }
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json")
  }

  const response = await app.request(path, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  return { status: response.status, body: await response.json() }
}

export function createApi(api: ApiOptions = {}) {
  return {
    get(path: string, options?: Omit<RequestOptions, "body">) {
      return request("GET", path, api, options)
    },
    post(path: string, options: RequestOptions = {}) {
      return request("POST", path, api, { body: {}, ...options })
    },
    patch(path: string, options: RequestOptions = {}) {
      return request("PATCH", path, api, { body: {}, ...options })
    },
    put(path: string, options: RequestOptions = {}) {
      return request("PUT", path, api, { body: {}, ...options })
    },
    delete(path: string, options?: Omit<RequestOptions, "body">) {
      return request("DELETE", path, api, options)
    },
  }
}
