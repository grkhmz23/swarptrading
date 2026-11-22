import { type DynamicModule, Module } from "@nestjs/common";
import { AuditModule } from "./audit/audit.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { AppConfigModule } from "./config/config.module.js";
import type { AppConfig } from "./config/config.js";
import { DatabaseModule } from "./db/database.module.js";
import { HealthController } from "./health/health.controller.js";

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [AppConfigModule.forRoot(config), DatabaseModule, AuditModule, AuthModule],
      controllers: [HealthController],
    };
  }
}
