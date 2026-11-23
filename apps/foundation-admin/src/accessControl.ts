import type { AccessControlProvider } from "@refinedev/core";
import { canWrite, getCurrentRole } from "@/auth/session";

/**
 * Which actions each resource supports at all, regardless of role. Reads are
 * open to every signed-in admin; writes additionally need an `admin` or
 * `superadmin` role. Users are never hard-deleted from the console, and
 * wallets/transactions are read-only.
 *
 * This only decides what the UI offers. The backend must apply the same rules.
 */
const RESOURCE_POLICY: Record<string, { read: boolean; write: readonly string[] }> = {
  dashboard: { read: true, write: [] },
  user: { read: true, write: ["edit"] },
  wallet: { read: true, write: [] },
  transaction: { read: true, write: [] },
  "launchpad-project": { read: true, write: ["edit", "delete"] },
};

const READ_ACTIONS = new Set(["list", "show"]);

export const checkAccess = (resource: string | undefined, action: string): { can: boolean; reason?: string } => {
  const policy = resource ? RESOURCE_POLICY[resource] : undefined;
  if (!policy) {
    return { can: false, reason: "Unknown resource." };
  }

  if (READ_ACTIONS.has(action)) {
    return policy.read ? { can: true } : { can: false, reason: "This resource is not available." };
  }

  if (!policy.write.includes(action)) {
    return { can: false, reason: `"${action}" is not available for this resource.` };
  }

  if (!canWrite(getCurrentRole())) {
    return { can: false, reason: "Your role has read-only access." };
  }

  return { can: true };
};

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => checkAccess(resource, action),
  options: {
    buttons: {
      enableAccessControl: true,
      hideIfUnauthorized: true,
    },
  },
};
