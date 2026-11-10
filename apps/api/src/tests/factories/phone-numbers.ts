import { db } from "@workspace/db/client"
import { phoneNumbersTable } from "@workspace/db/schema/phone-numbers"

// Phone numbers are unique across organizations
export function randomPhoneNumber() {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))
  return `+1555${digits.join("")}`.slice(0, 13)
}

export async function createPhoneNumber(
  organizationId: string,
  overrides: Partial<typeof phoneNumbersTable.$inferInsert> = {}
) {
  const [phoneNumber] = await db
    .insert(phoneNumbersTable)
    .values({
      id: crypto.randomUUID(),
      organizationId,
      number: randomPhoneNumber(),
      sipAddress: "sip.example.com",
      sipUsername: "sip-user",
      sipPassword: "sip-password",
      ...overrides,
    })
    .returning()
  return phoneNumber
}
