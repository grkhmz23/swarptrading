import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { errorBody, HttpErrorFilter } from "./common/http-error.filter.js";
import type { AppConfig } from "./config/config.js";

const BODY_LIMIT_BYTES = 64 * 1024;

export function createAdapter(config: AppConfig, options: { logger?: boolean } = {}): FastifyAdapter {
  return new FastifyAdapter({
    trustProxy: config.TRUST_PROXY,
    bodyLimit: BODY_LIMIT_BYTES,
    logger:
      options.logger === false
        ? false
        : {
            level: config.LOG_LEVEL,
            // Request logs never include bodies; strip credentials from the headers that are logged.
            redact: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'],
          },
  });
}

/** Plugins, CORS and error handling shared by the server and the integration tests. */
export async function configureApp(app: NestFastifyApplication, config: AppConfig): Promise<void> {
  await app.register(fastifyCookie);
  await app.register(fastifyHelmet);
  // Per-instance limit as a first line of defence; per-phone SMS limits are enforced in the database.
  await app.register(fastifyRateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
    errorResponseBuilder: (_request, context) =>
      errorBody(429, `Too many requests. Try again in ${context.after}.`),
  });

  const allowed = new Set(config.CORS_ORIGINS);
  app.enableCors({
    origin: (origin, callback) => callback(null, !origin || allowed.has(origin)),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "Accept", "Idempotency-Key"],
    maxAge: 600,
  });

  app.useGlobalFilters(new HttpErrorFilter());
  app.enableShutdownHooks();
}
