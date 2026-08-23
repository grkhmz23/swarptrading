import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "@/services/api";

const extractErrorMessage = (error: unknown): string | undefined => {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return undefined;
};

export interface UserProfile {
  id: string;
  email?: string;
  phoneNumber?: string;
  firstName: string;
  lastName: string;
  username?: string;
  isVerified: boolean;
  kycStatus?: 'not_started' | 'pending' | 'approved' | 'declined' | 'resubmission_requested';
  walletId?: string;
  walletAddress?: string;
}

export interface UserState extends Partial<UserProfile> {
  profilePictureUrl?: string | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error?: string | null;
}


const initialState: UserState = {
  status: "idle",
  error: null,
  profilePictureUrl: null,
};


export const fetchUserProfile = createAsyncThunk<UserProfile, string>(
  "user/fetchUserProfile",
  async (token, { rejectWithValue }) => {
    try {
      const data = await apiService.getUserProfile(token);
      return data;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err) || "Failed to fetch user profile");
    }
  }
);

type UpdateUserProfileResponse = Pick<UserProfile, "firstName" | "lastName" | "email">;

export const updateUserProfile = createAsyncThunk<
  UpdateUserProfileResponse,
  { data: { firstName: string; lastName: string; email: string }; token: string }
>(
  "user/updateUserProfile",
  async ({ data, token }, { rejectWithValue }) => {
    try {
      const response = await apiService.updateUserProfile(data, token);
      return response as UpdateUserProfileResponse;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err) || "Failed to update profile");
    }
  }
);

export const uploadProfilePicture = createAsyncThunk<
  string,
  { file: File; token: string }
>("user/uploadProfilePicture", async ({ file, token }, { rejectWithValue }) => {
  try {
    const { key } = await apiService.uploadProfilePicture(file, token);
    return key;
  } catch (err: unknown) {
    return rejectWithValue(extractErrorMessage(err) || "Failed to upload profile picture");
  }
});

export const fetchProfilePictureUrl = createAsyncThunk<string | null, string>(
  "/auth/profile-picture",
  async (token, { rejectWithValue }) => {
    try {
      const { url } = await apiService.getProfilePicture(token);
      return url;
    } catch (err: unknown) {
      return rejectWithValue(
        extractErrorMessage(err) || "Failed to fetch profile picture URL"
      );
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearUser(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchUserProfile.fulfilled, (state, action: PayloadAction<UserProfile>) => {
        state.status = "succeeded";
        Object.assign(state, action.payload);
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })

      .addCase(updateUserProfile.pending, (state) => {
        state.status = "loading";
      })
      .addCase(
        updateUserProfile.fulfilled,
        (state, action: PayloadAction<UpdateUserProfileResponse>) => {
          state.status = "succeeded";
          Object.assign(state, action.payload);
        }
      )
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })

      .addCase(uploadProfilePicture.pending, (state) => {
        state.status = "loading";
      })
      .addCase(uploadProfilePicture.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(uploadProfilePicture.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })

      .addCase(fetchProfilePictureUrl.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchProfilePictureUrl.fulfilled, (state, action: PayloadAction<string | null>) => {
        state.status = "succeeded";
        state.profilePictureUrl = action.payload;
      })
      .addCase(fetchProfilePictureUrl.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export const { clearUser } = userSlice.actions;
export default userSlice.reducer;
