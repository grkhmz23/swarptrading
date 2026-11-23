import type { FastifyRequest } from "fastify";

export interface RequestMeta {
  ip: string;
  userAgent: string | null;
}

/** Client IP (honours TRUST_PROXY via Fastify) and a length-capped user agent. */
export function requestMeta(request: FastifyRequest): RequestMeta {
  const userAgent = request.headers["user-agent"];
  return {
    ip: request.ip,
    userAgent: typeof userAgent === "string" ? userAgent.slice(0, 300) : null,
  };
}
