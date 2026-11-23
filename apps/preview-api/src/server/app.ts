import { ConfigError, config, type PreviewConfig } from "./config";
import { corsHeaders } from "./cors";
import { HttpError, errorResponse, json } from "./http";
import { Router, makeCtx } from "./router";
import { tokenSvg } from "./assets";
import { setSwarpMint } from "./data/tokens";
import { authRoutes } from "./routes/auth";
import { walletRoutes } from "./routes/wallet";
import { marketRoutes } from "./routes/market";
import { launchpadRoutes } from "./routes/launchpad";
import { rewardRoutes } from "./routes/rewards";

export function buildRouter(): Router {
  const r = new Router();
  r.get("/", () => ({
    service: "swarp-preview-api",
    sampleData: true,
    note: "Sample data for previewing the SwarpPay dashboard. Transactions are disabled.",
  }));
  authRoutes(r);
  walletRoutes(r);
  marketRoutes(r);
  launchpadRoutes(r);
  rewardRoutes(r);
  return r;
}

const router = buildRouter();

function withHeaders(response: Response, headers: Record<string, string>): Response {
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  return response;
}

/** Entry point for every request. `cfg` is injectable for tests. */
export async function handle(req: Request, cfg?: PreviewConfig): Promise<Response> {
  let settings: PreviewConfig;
  try {
    settings = cfg ?? config();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`[preview-api] ${err.message}`);
      return errorResponse(500, "The preview API is not configured. See apps/preview-api/README.md.");
    }
    throw err;
  }

  setSwarpMint(settings.swarpMint);
  const cors = corsHeaders(req.headers.get("origin"), settings.allowedOrigins);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const url = new URL(req.url);
  const asset = /^\/preview-assets\/token\/([A-Za-z0-9]{1,12})\.svg$/.exec(url.pathname);
  if (asset && req.method === "GET") {
    return new Response(tokenSvg(asset[1]), {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
        ...cors,
      },
    });
  }

  const found = router.match(req.method, url.pathname);
  if (found === null) return withHeaders(errorResponse(404, `Cannot ${req.method} ${url.pathname}`), cors);
  if (found === "method") return withHeaders(errorResponse(405, `${req.method} is not supported here.`), cors);

  try {
    const result = await found.handler(makeCtx(req, found.params, settings));
    return withHeaders(json(result ?? {}), cors);
  } catch (err) {
    if (err instanceof HttpError) return withHeaders(errorResponse(err.status, err.message), cors);
    console.error("[preview-api] unhandled error", err);
    return withHeaders(errorResponse(500, "Internal error."), cors);
  }
}
