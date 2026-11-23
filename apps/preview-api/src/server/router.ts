import type { PreviewConfig } from "./config";
import { requireSession, type SessionClaims } from "./auth";
import { HttpError, readJsonObject } from "./http";

export interface Ctx {
  req: Request;
  url: URL;
  params: Record<string, string>;
  /** Public origin of this API, for asset URLs. */
  origin: string;
  cfg: PreviewConfig;
  /** Claims of the bearer token; throws 401 when missing or invalid. */
  session(): SessionClaims;
  /** Claims when a valid bearer token is present, otherwise null. */
  optionalSession(): SessionClaims | null;
  body(): Promise<Record<string, unknown>>;
}

export type Handler = (ctx: Ctx) => unknown | Promise<unknown>;

interface Route {
  method: string;
  segments: string[];
  handler: Handler;
}

export class Router {
  private routes: Route[] = [];

  add(method: string, path: string, handler: Handler): this {
    this.routes.push({ method, segments: path.split("/").filter(Boolean), handler });
    return this;
  }

  get(path: string, handler: Handler) {
    return this.add("GET", path, handler);
  }
  post(path: string, handler: Handler) {
    return this.add("POST", path, handler);
  }
  put(path: string, handler: Handler) {
    return this.add("PUT", path, handler);
  }
  patch(path: string, handler: Handler) {
    return this.add("PATCH", path, handler);
  }
  delete(path: string, handler: Handler) {
    return this.add("DELETE", path, handler);
  }

  /** Find the handler for a request. Literal segments win over `:params`. */
  match(method: string, pathname: string): { handler: Handler; params: Record<string, string> } | "method" | null {
    let parts: string[];
    try {
      parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
    } catch {
      return null;
    }
    let pathMatched = false;
    let best: { handler: Handler; params: Record<string, string>; score: number } | null = null;
    for (const route of this.routes) {
      if (route.segments.length !== parts.length) continue;
      const params: Record<string, string> = {};
      let score = 0;
      const ok = route.segments.every((seg, i) => {
        if (seg.startsWith(":")) {
          params[seg.slice(1)] = parts[i];
          return true;
        }
        score++;
        return seg === parts[i];
      });
      if (!ok) continue;
      pathMatched = true;
      if (route.method !== method) continue;
      if (!best || score > best.score) best = { handler: route.handler, params, score };
    }
    if (best) return { handler: best.handler, params: best.params };
    return pathMatched ? "method" : null;
  }
}

export function makeCtx(req: Request, params: Record<string, string>, cfg: PreviewConfig): Ctx {
  const url = new URL(req.url);
  let cachedBody: Promise<Record<string, unknown>> | null = null;
  return {
    req,
    url,
    params,
    origin: url.origin,
    cfg,
    session: () => requireSession(req, cfg.jwtSecret),
    optionalSession: () => {
      if (!req.headers.get("authorization")) return null;
      try {
        return requireSession(req, cfg.jwtSecret);
      } catch (err) {
        if (err instanceof HttpError) return null;
        throw err;
      }
    },
    body: () => {
      cachedBody ??= readJsonObject(req);
      return cachedBody;
    },
  };
}
