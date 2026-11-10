import { db } from "@workspace/db/client"
import { contactsTable } from "@workspace/db/schema/contacts"
import { randomPhoneNumber } from "@/tests/factories/phone-numbers"

export async function createContact(
  organizationId: string,
  overrides: Partial<typeof contactsTable.$inferInsert> = {}
) {
  const [contact] = await db
    .insert(contactsTable)
    .values({
      id: crypto.randomUUID(),
      organizationId,
      phoneNumber: randomPhoneNumber(),
      ...overrides,
    })
    .returning()
  return contact
}

export async function getContact(contactId: string | null) {
  const contact = await db.query.contactsTable.findFirst({
    where: { id: contactId ?? "" },
  })
  if (!contact) throw new Error(`Contact ${contactId} not found`)
  return contact
}
