import { eq } from "drizzle-orm"

import { db } from "@workspace/db/client"
import { contactsTable } from "@workspace/db/schema/contacts"

export async function resolvePhoneContactId(
  organizationId: string,
  direction: "inbound" | "outbound",
  fromNumber: string | null | undefined,
  toNumber: string | null | undefined
): Promise<string | null> {
  const phoneNumber = (direction === "inbound" ? fromNumber : toNumber)?.trim()

  if (!phoneNumber) {
    return null
  }

  const existing = await db.query.contactsTable.findFirst({
    where: {
      organizationId,
      phoneNumber,
    },
    columns: { id: true },
  })

  if (existing) {
    return existing.id
  }

  const [created] = await db
    .insert(contactsTable)
    .values({
      id: crypto.randomUUID(),
      organizationId,
      phoneNumber,
    })
    .onConflictDoNothing()
    .returning({ id: contactsTable.id })

  if (created) {
    return created.id
  }

  const raced = await db.query.contactsTable.findFirst({
    where: {
      organizationId,
      phoneNumber,
    },
    columns: { id: true },
  })

  return raced?.id ?? null
}

export async function recordContactCall(
  contactId: string,
  startedAt: Date,
  durationMs: number
) {
  const contact = await db.query.contactsTable.findFirst({
    where: { id: contactId },
    columns: {
      callCount: true,
      totalDurationMs: true,
      firstCallAt: true,
      latestCallAt: true,
    },
  })

  if (!contact) {
    return
  }

  await db
    .update(contactsTable)
    .set({
      callCount: contact.callCount + 1,
      totalDurationMs: contact.totalDurationMs + durationMs,
      firstCallAt: contact.firstCallAt ?? startedAt,
      latestCallAt:
        !contact.latestCallAt || startedAt > contact.latestCallAt
          ? startedAt
          : contact.latestCallAt,
      updatedAt: new Date(),
    })
    .where(eq(contactsTable.id, contactId))
}
