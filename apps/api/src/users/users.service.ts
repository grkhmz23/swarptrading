import { Inject, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { DB, type Database } from "../db/database.js";
import { type User, users } from "../db/schema.js";

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Returns the account for a verified phone number, creating it on first sign-in. */
  async findOrCreateByPhone(phoneE164: string): Promise<{ user: User; created: boolean }> {
    const inserted = await this.db
      .insert(users)
      .values({ phoneE164 })
      .onConflictDoNothing({ target: users.phoneE164 })
      .returning();
    if (inserted[0]) return { user: inserted[0], created: true };
    const [existing] = await this.db.select().from(users).where(eq(users.phoneE164, phoneE164));
    if (!existing) throw new Error(`User for ${phoneE164} vanished between insert and select`);
    return { user: existing, created: false };
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async updateCountry(id: string, country: string): Promise<void> {
    await this.db.update(users).set({ country, updatedAt: sql`now()` }).where(eq(users.id, id));
  }
}
