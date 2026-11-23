import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import pg from "pg";
import { PG_POOL } from "../db/database.js";

@Controller("health")
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  /** Liveness plus a database round trip, for load balancers and uptime checks. */
  @Get()
  async check() {
    try {
      await this.pool.query("select 1");
    } catch {
      throw new ServiceUnavailableException("Database unavailable");
    }
    return { status: "ok" };
  }
}
