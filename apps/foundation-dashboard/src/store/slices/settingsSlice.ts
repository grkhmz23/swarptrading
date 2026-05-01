// store/slices/settingsSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface SettingsState {
  currency: "USD" | "EUR" | "GBP";
  language: "English" | "Italian";
  network: "Solana" | "Swarp";
}

// Load saved values from localStorage if available
const savedCurrency = (typeof window !== "undefined" ? localStorage.getItem("swarp_fd_currency") : null) as
  | "USD"
  | "EUR"
  | "GBP"
  | null;

const savedLanguage = (typeof window !== "undefined" ? localStorage.getItem("swarp_fd_language") : null) as
  | "English"
  | "Italian"
  | null;

const savedNetwork = (typeof window !== "undefined" ? localStorage.getItem("swarp_fd_network") : null) as
  | "Solana"
  | "Swarp"
  | null;

const initialState: SettingsState = {
  currency: savedCurrency || "USD",
  language: savedLanguage || "English",
  network: savedNetwork || "Solana",
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
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

export const { setCurrency, setLanguage, setNetwork } = settingsSlice.actions;
export default settingsSlice.reducer;
