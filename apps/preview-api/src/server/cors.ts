const ALLOWED_HEADERS = "Authorization, Content-Type, Accept, Idempotency-Key";
const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

export function corsHeaders(origin: string | null, allowed: RegExp[]): Record<string, string> {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && allowed.some((pattern) => pattern.test(origin))) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = ALLOWED_HEADERS;
    headers["Access-Control-Allow-Methods"] = ALLOWED_METHODS;
    headers["Access-Control-Max-Age"] = "600";
  }
  return headers;
}
