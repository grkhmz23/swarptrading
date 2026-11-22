import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { configureApp, createAdapter } from "./bootstrap.js";
import { ConfigError, loadConfig } from "./config/config.js";

let config;
try {
  config = loadConfig();
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}

const app = await NestFactory.create<NestFastifyApplication>(AppModule.forRoot(config), createAdapter(config));
await configureApp(app, config);
await app.listen(config.PORT, config.HOST);
