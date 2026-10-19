import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";

import * as schema from "./schema.js";

export function createDatabase(pool: Pool) {
  return drizzle(pool, { schema });
}

export type LedgerDatabase = ReturnType<typeof createDatabase>;
export type LedgerDatabaseTransaction = Parameters<
  Parameters<LedgerDatabase["transaction"]>[0]
>[0];
export type LedgerDatabaseSession = LedgerDatabase | LedgerDatabaseTransaction;
