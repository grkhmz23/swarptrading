"use client";

import { useEffect } from "react";
import { setUnauthorizedHandler } from "@/lib/http";
import { clearSession, onSessionCleared } from "@/lib/session";
import { resetSessionState, store } from "@/store";

/**
 * Wires session expiry for the whole app: when an authenticated request gets a
 * 401, every client-side trace of the session is removed and the user is sent
 * back to sign-in.
 */
export function SessionManager() {
  useEffect(() => {
    const unsubscribe = onSessionCleared(() => store.dispatch(resetSessionState()));
    setUnauthorizedHandler(() => {
      clearSession();
      if (window.location.pathname !== "/") window.location.replace("/");
    });
    return () => {
      unsubscribe();
      setUnauthorizedHandler(null);
    };
  }, []);

  return null;
}
