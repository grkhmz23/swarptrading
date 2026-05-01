import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "@/services/api";

// =======================
// Types
// =======================
export interface Referral {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  profilePicture: string | null;
  walletAddress: string | null;
  joinedAt: string;
}

interface ReferralState {
  referrals: Referral[];
  count: number;
  loading: boolean;
  error: string | null;
}

// =======================
// Initial State
// =======================
const initialState: ReferralState = {
  referrals: [],
  count: 0,
  loading: false,
  error: null,
};

// =======================
// Async Thunk
// =======================
type ReferralApiResponse = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  profilePicture?: string | null;
  walletAddress?: string | null;
  joinedAt: string;
};

export const fetchReferrals = createAsyncThunk<
  { count: number; referrals: Referral[] }, // return type
  string,                                  // argument type (token)
  { rejectValue: string }                  // thunkAPI reject type
>(
  "referrals/fetchReferrals",
  async (token, { rejectWithValue }) => {
    try {
      const res = await apiService.getMyReferrals(token);

      if (!res || typeof res.count !== "number" || !Array.isArray(res.referrals)) {
        return rejectWithValue("Invalid response from API");
      }

      // Map API referrals to ensure walletAddress exists
      const referrals: Referral[] = res.referrals.map((r: ReferralApiResponse) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        phoneNumber: r.phoneNumber,
        profilePicture: r.profilePicture ?? null,
        walletAddress: r.walletAddress ?? null, // ✅ add this to satisfy type
        joinedAt: r.joinedAt,
      }));
console.log("Fetched referrals:", referrals);
      return { count: res.count, referrals };
    } catch (err: unknown) {
      if (err instanceof Error) return rejectWithValue(err.message);
      return rejectWithValue("Failed to fetch referrals");
    }
  }
);


// =======================
// Slice
// =======================
const referralSlice = createSlice({
  name: "referrals",
  initialState,
  reducers: {
    clearReferrals: (state) => {
      state.referrals = [];
      state.count = 0;
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReferrals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchReferrals.fulfilled,
        (state, action: PayloadAction<{ count: number; referrals: Referral[] }>) => {
          state.loading = false;
          state.referrals = action.payload.referrals;
          state.count = action.payload.count;
        }
      )
      .addCase(fetchReferrals.rejected, (state, action) => {
        state.loading = false;
        // action.payload is typed as string | undefined
        state.error = action.payload ?? "Failed to fetch referrals";
      });
  },
});

// =======================
// Exports
// =======================
export const { clearReferrals } = referralSlice.actions;
export default referralSlice.reducer;
