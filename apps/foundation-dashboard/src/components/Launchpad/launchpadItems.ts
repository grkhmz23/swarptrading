// src/components/Launchpad/launchpadItems.ts
import type { InnerSidebarItem } from '@/components/Setting/InnerSidebar';

// Base items with translation keys (for i18n support)
export const LAUNCHPAD_INNER_ITEMS_BASE = [
  { id: "home", labelKey: "home" as const, icon: "home-active" },
  { id: "portfolio", labelKey: "portfolio" as const, icon: "portfolio" },
  { id: "trade-history", labelKey: "tradeHistory" as const, icon: "trade-history" },
  { id: "watchlist", labelKey: "watchlist" as const, icon: "watchlist" },
  { id: "alerts", labelKey: "alerts" as const, icon: "alerts" },
  { id: "request-token", labelKey: "requestToken" as const, icon: "request-token" },
  { id: "support", labelKey: "support" as const, icon: "support" },
];

// Default English labels for backwards compatibility
export const LAUNCHPAD_INNER_ITEMS: InnerSidebarItem[] = [
  { id: "home", label: "Home", icon: "house-final" },
  { id: "portfolio", label: "Portfolio", icon: "launchpad/portfolio" },
  { id: "trade-history", label: "Trade History", icon: "launchpad/trade-history" },
  { id: "watchlist", label: "Watchlist", icon: "launchpad/watchlist" },
  { id: "alerts", label: "Alerts", icon: "launchpad/alerts" },
  { id: "request-token", label: "Request Token", icon: "launchpad/request-token" },
  { id: "support", label: "Support", icon: "launchpad/support" },
];
