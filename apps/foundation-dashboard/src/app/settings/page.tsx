"use client";

import { RequireSession } from "@/components/session/RequireSession";
import { SettingsContent } from "@/components/Setting/SettingsContent";

export default function SettingsPage() {
  return (
    <RequireSession level="unlocked">
      <SettingsContent />
    </RequireSession>
  );
}
