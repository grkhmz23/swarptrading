"use client";

import { Provider } from "react-redux";
import { store } from "@/store";
import { I18nProvider } from "@/i18n/I18nProvider";
import { SessionManager } from "@/components/session/SessionManager";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SessionManager />
      <I18nProvider>{children}</I18nProvider>
    </Provider>
  );
}
