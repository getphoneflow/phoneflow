import { PostHogProvider } from "@posthog/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import posthog from "posthog-js"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { Toaster } from "@workspace/ui/components/sonner"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import "@workspace/ui/globals.css"

import { RouteErrorBoundary } from "@/components/error-boundary"
import { ThemeProvider } from "@/components/theme-provider"
import { env } from "@/lib/env"
import { routeTree } from "./routeTree.gen"

if (env.POSTHOG_PROJECT_TOKEN) {
  posthog.init(env.POSTHOG_PROJECT_TOKEN, {
    api_host: env.POSTHOG_HOST,
    defaults: "2026-05-30",
  })
}

const queryClient = new QueryClient()

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultErrorComponent: RouteErrorBoundary,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </PostHogProvider>
  </StrictMode>
)
