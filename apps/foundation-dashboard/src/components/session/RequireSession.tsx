"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getValidAccessToken } from "@/lib/session";
import { isSessionUnlocked } from "@/lib/pinGate";

interface RequireSessionProps {
  /**
   * `token`: any valid sign-in token (onboarding steps after OTP / Google).
   * `unlocked`: a valid token whose wallet PIN was entered in this tab.
   */
  level: "token" | "unlocked";
  children: ReactNode;
}

function FullScreenSpinner() {
  return (
    <div className="min-h-screen bg-[#090A11] flex items-center justify-center" aria-busy="true">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#40E0D0]" />
    </div>
  );
}

/** Safe in-app redirect target: a same-origin path, never `//host` or a URL. */
export function safeNextPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

/** Client-side route guard. The backend remains the authority for every API call. */
export function RequireSession({ level, children }: RequireSessionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = getValidAccessToken();
    if (!token) {
      clearSession();
      router.replace("/");
      return;
    }
    if (level === "unlocked" && !isSessionUnlocked(token)) {
      router.replace(`/unlock?next=${encodeURIComponent(safeNextPath(pathname))}`);
      return;
    }
    setAllowed(true);
  }, [level, pathname, router]);

  return allowed ? <>{children}</> : <FullScreenSpinner />;
}
