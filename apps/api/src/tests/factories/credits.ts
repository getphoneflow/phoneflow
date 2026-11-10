import { eq } from "drizzle-orm"

import { db } from "@workspace/db/client"
import { organization } from "@workspace/db/schema/auth"

export async function setCreditBalance(
  organizationId: string,
  balance: number
) {
  await db
    .update(organization)
    .set({ creditBalance: balance.toFixed(6) })
    .where(eq(organization.id, organizationId))
}

export async function getCreditBalance(organizationId: string) {
  const org = await db.query.organization.findFirst({
    where: { id: organizationId },
  })
  return Number(org?.creditBalance)
}
