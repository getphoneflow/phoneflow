import { and, eq, inArray } from "drizzle-orm"

import { db } from "@workspace/db/client"
import { doNotCallNumbersTable } from "@workspace/db/schema/do-not-call"
import { normalizePhoneNumber } from "@workspace/shared/api/do-not-call/schemas"

export class DoNotCallError extends Error {
  constructor() {
    super("Number is on the organization's do-not-call list")
    this.name = "DoNotCallError"
  }
}

// Returns the subset of `numbers`, as given, that is on the organization's list.
export async function findDoNotCallNumbers(
  organizationId: string,
  numbers: string[]
) {
  const normalized = numbers.flatMap((number) => {
    const value = normalizePhoneNumber(number)
    return value ? [value] : []
  })

  if (normalized.length === 0) {
    return new Set<string>()
  }

  const rows = await db
    .select({ number: doNotCallNumbersTable.number })
    .from(doNotCallNumbersTable)
    .where(
      and(
        eq(doNotCallNumbersTable.organizationId, organizationId),
        inArray(doNotCallNumbersTable.number, normalized)
      )
    )

  const listed = new Set(rows.map((row) => row.number))

  return new Set(
    numbers.filter((number) => {
      const value = normalizePhoneNumber(number)
      return value !== null && listed.has(value)
    })
  )
}

export async function isDoNotCall(organizationId: string, number: string) {
  const listed = await findDoNotCallNumbers(organizationId, [number])
  return listed.size > 0
}

export function remotePhoneNumber(call: {
  channel: "phone_call" | "web_call"
  direction: "inbound" | "outbound"
  fromNumber: string | null
  toNumber: string | null
}) {
  if (call.channel !== "phone_call") {
    return null
  }

  const number = call.direction === "outbound" ? call.toNumber : call.fromNumber

  return number ? normalizePhoneNumber(number) : null
}
