/**
 * Single source of runtime configuration for the admin console.
 *
 * `VITE_ADMIN_API_URL` is required for production builds (vite.config.ts fails
 * the build without it); the check below is a second line of defence for
 * bundles produced some other way. In development it defaults to the local API.
 */

const DEV_DEFAULT_API_URL = "http://localhost:3000";
const DEFAULT_API_BASE_PATH = "/admin-api";

function resolveApiUrl(): string {
  const raw = import.meta.env.VITE_ADMIN_API_URL?.trim();

  if (!raw) {
    if (import.meta.env.PROD) {
      throw new Error("VITE_ADMIN_API_URL must be set for production builds.");
    }
    return DEV_DEFAULT_API_URL;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`VITE_ADMIN_API_URL is not a valid URL: ${raw}`);
  }

  if (import.meta.env.PROD && parsed.protocol !== "https:") {
    throw new Error("VITE_ADMIN_API_URL must use https in production builds.");
  }

  // Origin plus optional path prefix, without a trailing slash.
  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
}

function resolveBasePath(): string {
  const raw = import.meta.env.VITE_ADMIN_API_BASE_PATH?.trim() || DEFAULT_API_BASE_PATH;
  const trimmed = raw.replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "";
}

export const API_URL = resolveApiUrl();
export const API_BASE_PATH = resolveBasePath();

export const TOKEN_STORAGE_KEY = "swarp_foundation_admin_token";
export const USER_STORAGE_KEY = "swarp_foundation_admin_user";

/** Resource name (as registered with Refine) -> REST collection under API_BASE_PATH. */
export const RESOURCE_ENDPOINTS: Record<string, string> = {
  user: "users",
  wallet: "wallets",
  transaction: "transactions",
  "launchpad-project": "launchpad-projects",
};

/** Builds `${API_BASE_PATH}/<path>`; `path` must not start with a slash. */
export const adminApiPath = (path: string): string => `${API_BASE_PATH}/${path}`;
