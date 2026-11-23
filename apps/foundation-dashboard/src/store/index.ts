import { combineReducers, configureStore, createAction, type UnknownAction } from "@reduxjs/toolkit";
import rewardReducer from "./slices/rewardSlice";
import contactsReducer from "./slices/contactSlice";
import userReducer from "./slices/userSlice";
import referralReducer from "./slices/referralSlice";
import settingsReducer from "./slices/settingsSlice";

/** Dispatched on logout / session expiry: wipes every user-scoped slice, keeps UI settings. */
export const resetSessionState = createAction("session/reset");

const appReducer = combineReducers({
  rewards: rewardReducer,
  contacts: contactsReducer,
  user: userReducer,
  referrals: referralReducer,
  settings: settingsReducer,
});

type AppState = ReturnType<typeof appReducer>;

function rootReducer(state: AppState | undefined, action: UnknownAction): AppState {
  if (resetSessionState.match(action)) {
    return appReducer({ settings: state?.settings } as AppState, action);
  }
  return appReducer(state, action);
}

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
