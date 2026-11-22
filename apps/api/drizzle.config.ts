import { defineConfig } from "drizzle-kit";

// Used only by `npm run db:generate`, which diffs src/db/schema.ts against the
// existing migrations; it does not connect to a database.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  strict: true,
});
