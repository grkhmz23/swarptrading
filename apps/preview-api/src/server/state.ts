import type { LaunchpadAlert } from "./types";
import { DEFAULT_CONTACTS, DEFAULT_PREFERENCES, initialNotifications, type Notification, type NotificationPreferences } from "./data/account";

/**
 * Mutable preview state (watchlist, alerts, contacts, ...). It lives in this
 * server instance's memory: it is shared by everyone using the preview and
 * resets when the instance restarts. Nothing here can move funds.
 */
export interface PreviewState {
  watchlist: Set<string>;
  alerts: LaunchpadAlert[];
  contacts: { nickname: string; address: string }[];
  notifications: Notification[];
  preferences: NotificationPreferences;
  username: string;
  profile: { firstName: string; lastName: string; email: string };
  language: string;
  nextId: number;
}

export const LIMITS = { alerts: 50, contacts: 50 } as const;

function initialAlerts(now: number): LaunchpadAlert[] {
  const created = new Date(now - 2 * 86_400_000).toISOString();
  return [
    {
      id: "alert-1",
      projectId: "orbit-cats",
      projectName: "Orbit Cats",
      projectTicker: "ORCAT",
      condition: "goes_over",
      targetPrice: "0.00005",
      currency: "SOL",
      note: "Take some profit",
      status: "active",
      createdAt: created,
      updatedAt: created,
    },
    {
      id: "alert-2",
      projectId: "deep-reef",
      projectName: "Deep Reef",
      projectTicker: "REEF",
      condition: "goes_under",
      targetPrice: "0.0000150",
      currency: "SOL",
      status: "active",
      createdAt: created,
      updatedAt: created,
    },
  ];
}

export function createState(now = Date.now()): PreviewState {
  return {
    watchlist: new Set(["orbit-cats", "deep-reef", "echo-finch"]),
    alerts: initialAlerts(now),
    contacts: DEFAULT_CONTACTS.map((c) => ({ ...c })),
    notifications: initialNotifications(now),
    preferences: { ...DEFAULT_PREFERENCES },
    username: "swarp_preview",
    profile: { firstName: "Swarp", lastName: "Preview", email: "" },
    language: "English",
    nextId: 1,
  };
}

let state: PreviewState | null = null;

export function previewState(): PreviewState {
  state ??= createState();
  return state;
}

/** For tests. */
export function resetPreviewState(): void {
  state = null;
}
