"use client";

import SettingsLayout from "@/components/Setting/SettingsLayout";
import { SETTINGS_INNER_ITEMS_BASE } from '@/components/Setting/settingsItems';
import { useT } from "@/i18n/I18nProvider";
import type { InnerSidebarItem } from "@/components/Setting/InnerSidebar";

export function SettingsContent() {
  const t = useT();

  const translatedItems: InnerSidebarItem[] = SETTINGS_INNER_ITEMS_BASE.map((item) => ({
    id: item.id,
    label: t.settings?.sidebar?.[item.labelKey] || item.labelKey,
    icon: item.icon,
  }));

  return (
    <div className="w-full">
      <SettingsLayout innerItems={translatedItems} />
    </div>
  );
}
