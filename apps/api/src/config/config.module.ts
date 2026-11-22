import { type DynamicModule, Module } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "./config.js";

/** Makes the validated configuration injectable everywhere as APP_CONFIG. */
@Module({})
export class AppConfigModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppConfigModule,
      global: true,
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}
