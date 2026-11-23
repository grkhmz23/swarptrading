// store/slices/settingsSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface SettingsState {
  currency: "USD" | "EUR" | "GBP";
  language: "English" | "Italian";
  network: "Solana" | "Swarp";
}

const CURRENCIES: SettingsState["currency"][] = ["USD", "EUR", "GBP"];
const LANGUAGES: SettingsState["language"][] = ["English", "Italian"];
const NETWORKS: SettingsState["network"][] = ["Solana", "Swarp"];

// Server render and first client render use the defaults; saved preferences are
// applied after mount (see loadSavedSettings) so hydration output matches.
const initialState: SettingsState = {
  currency: "USD",
  language: "English",
  network: "Solana",
};

/** Saved preferences from localStorage, ignoring unknown values. */
export function loadSavedSettings(): Partial<SettingsState> {
  if (typeof window === "undefined") return {};
  const pick = <T extends string>(key: string, allowed: T[]): T | undefined => {
    const value = window.localStorage.getItem(key) as T | null;
    return value && allowed.includes(value) ? value : undefined;
  };
  const saved: Partial<SettingsState> = {};
  const currency = pick("swarp_fd_currency", CURRENCIES);
  const language = pick("swarp_fd_language", LANGUAGES);
  const network = pick("swarp_fd_network", NETWORKS);
  if (currency) saved.currency = currency;
  if (language) saved.language = language;
  if (network) saved.network = network;
  return saved;
}

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    hydrateSettings(state, action: PayloadAction<Partial<SettingsState>>) {
      Object.assign(state, action.payload);
    },
    setCurrency(state, action: PayloadAction<"USD" | "EUR" | "GBP">) {
      state.currency = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("swarp_fd_currency", action.payload);
      }
    },
    setLanguage(state, action: PayloadAction<"English" | "Italian">) {
      state.language = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("swarp_fd_language", action.payload);
      }
    },
    setNetwork(state, action: PayloadAction<"Solana" | "Swarp">) {
      state.network = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("swarp_fd_network", action.payload);
      }
    },
  },
});

export const { hydrateSettings, setCurrency, setLanguage, setNetwork } = settingsSlice.actions;
export default settingsSlice.reducer;
