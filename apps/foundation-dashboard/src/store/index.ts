import { configureStore } from "@reduxjs/toolkit";
import rewardReducer from "./slices/rewardSlice";
import contactsReducer from "./slices/contactSlice";
import userReducer from "./slices/userSlice";
import referralReducer from "./slices/referralSlice";
import settingsReducer from "./slices/settingsSlice";


export const store = configureStore({
  reducer: {
    rewards: rewardReducer,
    contacts: contactsReducer,
 user: userReducer,
  referrals: referralReducer,
    settings: settingsReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
