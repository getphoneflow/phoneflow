import posthog from "posthog-js"

export function captureEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  posthog.capture(event, properties)
}

export function identifyUser(user: {
  id: string
  email: string
  name: string
}) {
  posthog.identify(user.id, {
    email: user.email,
    name: user.name,
  })
}

export function identifyOrganization(org: { id: string; name: string }) {
  posthog.group("organization", org.id, { name: org.name })
}

export function resetAnalytics() {
  posthog.reset()
}
