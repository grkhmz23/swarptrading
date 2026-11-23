/** JSON responses in the error shape the dashboard's HTTP client reads (`message`, `error`, `statusCode`). */

const STATUS_TEXT: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  413: "Payload Too Large",
  500: "Internal Server Error",
  501: "Not Implemented",
};

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export const PREVIEW_DISABLED =
  "Preview build: this action is disabled. The preview uses sample data and cannot move funds or change accounts.";

export function disabled(): never {
  throw new HttpError(403, PREVIEW_DISABLED);
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export function errorResponse(status: number, message: string): Response {
  return json({ statusCode: status, message, error: STATUS_TEXT[status] ?? "Error" }, status);
}

const MAX_BODY_BYTES = 64 * 1024;

/** Parse a JSON object body; anything else is a 400. */
export async function readJsonObject(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "Request body too large.");
  if (!text.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new HttpError(400, "Body must be JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError(400, "Body must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

export function str(body: Record<string, unknown>, key: string, opts: { max?: number; optional?: boolean } = {}): string {
  const value = body[key];
  if (value === undefined || value === null || value === "") {
    if (opts.optional) return "";
    throw new HttpError(400, `${key} is required.`);
  }
  if (typeof value !== "string") throw new HttpError(400, `${key} must be a string.`);
  const trimmed = value.trim();
  if (trimmed.length > (opts.max ?? 200)) throw new HttpError(400, `${key} is too long.`);
  return trimmed;
}

export function num(body: Record<string, unknown>, key: string, opts: { min?: number; optional?: boolean } = {}): number {
  const value = body[key];
  if (value === undefined || value === null || value === "") {
    if (opts.optional) return NaN;
    throw new HttpError(400, `${key} is required.`);
  }
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) throw new HttpError(400, `${key} must be a number.`);
  if (opts.min !== undefined && n < opts.min) throw new HttpError(400, `${key} must be at least ${opts.min}.`);
  return n;
}

export function queryInt(params: URLSearchParams, key: string, fallback: number, max: number): number {
  const raw = params.get(key);
  if (raw === null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, `${key} must be a positive integer.`);
  return Math.min(n, max);
}
