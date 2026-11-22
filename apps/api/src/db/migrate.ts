/**
 * Apply pending migrations: `npm run build && npm run db:migrate`.
 * Reads only DATABASE_URL / DATABASE_SSL so it can run before the full
 * application configuration exists (e.g. as a release step).
 */
import { z } from "zod";
import { createDatabase, createPool, runMigrations } from "./database.js";

const env = z
  .object({
    DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, "must be a postgres:// URL"),
    DATABASE_SSL: z.enum(["true", "false"]).default("false"),
  })
  .parse(process.env);

const pool = createPool({ DATABASE_URL: env.DATABASE_URL, DATABASE_SSL: env.DATABASE_SSL === "true", DATABASE_POOL_MAX: 1 });
try {
  await runMigrations(createDatabase(pool));
  console.log("Migrations applied.");
} finally {
  await pool.end();
}
