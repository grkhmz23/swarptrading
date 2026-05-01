import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiService, RewardResponse, RewardCategory, RewardSection } from "@/services/api";

// Re-export types for components
export type { RewardResponse, RewardCategory, RewardSection };

type RewardState = {
  // All rewards
  rewards: RewardResponse[];
  // Filtered rewards by section
  milestones: RewardResponse[]; // Refer & Earn screen
  yourRewards: RewardResponse[]; // Home screen - Your Rewards
  moreRewards: RewardResponse[]; // Home screen - More Rewards
  // Loading states
  loading: boolean;
  loadingYourRewards: boolean;
  loadingMoreRewards: boolean;
  loadingMilestones: boolean;
  claiming: string | null;
  error: string | null;
};

const initialState: RewardState = {
  rewards: [],
  milestones: [],
  yourRewards: [],
  moreRewards: [],
  loading: false,
  loadingYourRewards: false,
  loadingMoreRewards: false,
  loadingMilestones: false,
  claiming: null,
  error: null,
};

// Fetch all rewards
export const fetchRewards = createAsyncThunk<
  RewardResponse[],
  { userId: string; token: string },
  { rejectValue: string }
>("rewards/fetchAll", async ({ userId, token }, { rejectWithValue }) => {
  try {
    const res = await apiService.getAllRewards(userId, token);
    return res;
  } catch (err: unknown) {
    if (err instanceof Error) {
      return rejectWithValue(err.message);
    }
    return rejectWithValue("Failed to fetch rewards");
  }
});

// Fetch referral milestones (for Refer & Earn screen)
export const fetchMilestones = createAsyncThunk<
  RewardResponse[],
  { userId: string; token: string },
  { rejectValue: string }
>("rewards/fetchMilestones", async ({ userId, token }, { rejectWithValue }) => {
  try {
    const res = await apiService.getReferralMilestones(userId, token);
    return res;
  } catch (err: unknown) {
    if (err instanceof Error) {
      return rejectWithValue(err.message);
    }
    return rejectWithValue("Failed to fetch milestones");
  }
});

// Fetch Your Rewards (for Home screen)
export const fetchYourRewards = createAsyncThunk<
  RewardResponse[],
  { userId: string; token: string },
  { rejectValue: string }
>("rewards/fetchYourRewards", async ({ userId, token }, { rejectWithValue }) => {
  try {
    const res = await apiService.getYourRewards(userId, token);
    return res;
  } catch (err: unknown) {
    if (err instanceof Error) {
      return rejectWithValue(err.message);
    }
    return rejectWithValue("Failed to fetch your rewards");
  }
});

// Fetch More Rewards (for Home screen)
export const fetchMoreRewards = createAsyncThunk<
  RewardResponse[],
  { userId: string; token: string },
  { rejectValue: string }
>("rewards/fetchMoreRewards", async ({ userId, token }, { rejectWithValue }) => {
  try {
    const res = await apiService.getMoreRewards(userId, token);
    return res;
  } catch (err: unknown) {
    if (err instanceof Error) {
      return rejectWithValue(err.message);
    }
    return rejectWithValue("Failed to fetch more rewards");
  }
});

// Claim reward
export const claimReward = createAsyncThunk<
  { rewardName: string; rewardType: string; claimed: boolean },
  { userId: string; rewardType: string; token: string },
  { rejectValue: string }
>("rewards/claim", async ({ userId, rewardType, token }, { rejectWithValue }) => {
  try {
    const res = await apiService.claimReward(userId, rewardType, token);
    return res;
  } catch (err: unknown) {
    if (err instanceof Error) {
      return rejectWithValue(err.message);
    }
    return rejectWithValue("Failed to claim reward");
  }
});

const rewardSlice = createSlice({
  name: "rewards",
  initialState,
  reducers: {
    resetRewards: (state) => {
      state.rewards = [];
      state.milestones = [];
      state.yourRewards = [];
      state.moreRewards = [];
      state.loading = false;
      state.loadingYourRewards = false;
      state.loadingMoreRewards = false;
      state.loadingMilestones = false;
      state.claiming = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All Rewards
      .addCase(fetchRewards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRewards.fulfilled, (state, action: PayloadAction<RewardResponse[]>) => {
        state.loading = false;
        state.rewards = action.payload;
        // Also populate filtered arrays
        state.milestones = action.payload.filter((r) => r.section === "MILESTONES");
        state.yourRewards = action.payload.filter((r) => r.section === "YOUR_REWARDS");
        state.moreRewards = action.payload.filter((r) => r.section === "MORE_REWARDS");
      })
      .addCase(fetchRewards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch rewards";
      })

      // Fetch Milestones
      .addCase(fetchMilestones.pending, (state) => {
        state.loadingMilestones = true;
        state.error = null;
      })
      .addCase(fetchMilestones.fulfilled, (state, action: PayloadAction<RewardResponse[]>) => {
        state.loadingMilestones = false;
        state.milestones = action.payload;
      })
      .addCase(fetchMilestones.rejected, (state, action) => {
        state.loadingMilestones = false;
        state.error = action.payload || "Failed to fetch milestones";
      })

      // Fetch Your Rewards
      .addCase(fetchYourRewards.pending, (state) => {
        state.loadingYourRewards = true;
        state.error = null;
      })
      .addCase(fetchYourRewards.fulfilled, (state, action: PayloadAction<RewardResponse[]>) => {
        state.loadingYourRewards = false;
        state.yourRewards = action.payload;
      })
      .addCase(fetchYourRewards.rejected, (state, action) => {
        state.loadingYourRewards = false;
        state.error = action.payload || "Failed to fetch your rewards";
      })

      // Fetch More Rewards
      .addCase(fetchMoreRewards.pending, (state) => {
        state.loadingMoreRewards = true;
        state.error = null;
      })
      .addCase(fetchMoreRewards.fulfilled, (state, action: PayloadAction<RewardResponse[]>) => {
        state.loadingMoreRewards = false;
        state.moreRewards = action.payload;
      })
      .addCase(fetchMoreRewards.rejected, (state, action) => {
        state.loadingMoreRewards = false;
        state.error = action.payload || "Failed to fetch more rewards";
      })

      // Claim Reward
      .addCase(claimReward.pending, (state, action) => {
        state.claiming = action.meta.arg.rewardType;
        state.error = null;
      })
      .addCase(claimReward.fulfilled, (state, action) => {
        state.claiming = null;
        const { rewardType, claimed } = action.payload;

        // Update in all arrays
        const updateReward = (r: RewardResponse) =>
          r.rewardType === rewardType ? { ...r, claimed } : r;

        state.rewards = state.rewards.map(updateReward);
        state.milestones = state.milestones.map(updateReward);
        state.yourRewards = state.yourRewards.map(updateReward);
        state.moreRewards = state.moreRewards.map(updateReward);
      })
      .addCase(claimReward.rejected, (state, action) => {
        state.claiming = null;
        state.error = action.payload || "Failed to claim reward";
      });
  },
});

export const { resetRewards } = rewardSlice.actions;
export default rewardSlice.reducer;
