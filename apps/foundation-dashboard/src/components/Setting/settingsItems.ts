// src/constants/settingsItems.ts
import type { InnerSidebarItem } from '@/components/Setting/InnerSidebar';

// Base items with translation keys
export const SETTINGS_INNER_ITEMS_BASE = [
  { id: "general", labelKey: "general" as const, icon: "generalSvg" },
  { id: "address-book", labelKey: "addressBook" as const, icon: "adressBookSvg" },
  { id: "notifications", labelKey: "notifications" as const, icon: "notificationSvg" },
  { id: "refer", labelKey: "referAndEarn" as const, icon: "referNearnSvg" },
  { id: "security", labelKey: "security" as const, icon: "securitySvg" },
];

// For backwards compatibility - these are the default English labels
export const SETTINGS_INNER_ITEMS: InnerSidebarItem[] = [
  { id: "general", label: "General", icon: "generalSvg" },
  { id: "address-book", label: "Address book", icon: "adressBookSvg" },
  { id: "notifications", label: "Notifications", icon: "notificationSvg" },
  { id: "refer", label: "Refer & earn", icon: "referNearnSvg" },
  { id: "security", label: "Security & privacy", icon: "securitySvg" },
];
