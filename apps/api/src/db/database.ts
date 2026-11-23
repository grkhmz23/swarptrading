import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { fileURLToPath } from "node:url";
import type { AppConfig } from "../config/config.js";
import * as schema from "./schema.js";

export type Database = NodePgDatabase<typeof schema>;

/** Injection tokens. */
export const DB = Symbol("DB");
export const PG_POOL = Symbol("PG_POOL");

/** Migrations live in apps/api/drizzle; this file sits in src/db or dist/db. */
export const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../drizzle", import.meta.url));

export function createPool(config: Pick<AppConfig, "DATABASE_URL" | "DATABASE_SSL" | "DATABASE_POOL_MAX">): pg.Pool {
  return new pg.Pool({
    connectionString: config.DATABASE_URL,
    max: config.DATABASE_POOL_MAX,
    ssl: config.DATABASE_SSL ? { rejectUnauthorized: true } : undefined,
    // Fail fast instead of queueing forever when the database is unreachable.
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });
}

export function createDatabase(pool: pg.Pool): Database {
  return drizzle({ client: pool, schema });
}

export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
