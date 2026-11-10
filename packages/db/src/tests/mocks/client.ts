import { fileURLToPath } from "node:url"
import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"

import { relations } from "@workspace/db/schema/relations"

// In-process Postgres (PGlite) with the real migrations
export const db = drizzle({ client: new PGlite(), relations })

await migrate(db, {
  migrationsFolder: fileURLToPath(new URL("../../../drizzle", import.meta.url)),
})
