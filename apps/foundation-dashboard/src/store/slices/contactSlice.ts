import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "@/services/api";

// ✅ Updated interface to include profilePicture
export interface Contact {
  nickname: string;
  address: string;
  profilePicture?: string;
}

interface ContactsState {
  items: Contact[];
  loading: boolean;
  error: string | null;
}

const initialState: ContactsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchContacts = createAsyncThunk(
  "contacts/fetchContacts",
  async ({ userId, token }: { userId: string; token: string }) => {
    const res = await apiService.getUserContacts(userId, token);
    return res.contacts as Contact[];
  }
);

// Add a contact
export const addContact = createAsyncThunk<
  Contact[], // return type
  { userId: string; data: Contact; token: string },
  { rejectValue: string } // rejectWithValue type
>(
  "contacts/addContact",
  async ({ userId, data, token }, { rejectWithValue }) => {
    try {
      const res = await apiService.addUserContact(
        userId,
        data.nickname,
        data.address,
        token
      );
      // ✅ Return contacts with profilePicture
      return res.contacts as Contact[];
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message =
        apiError.response?.data?.message ||
        (typeof apiError.message === "string" ? apiError.message : undefined) ||
        "Failed to add contact";
      return rejectWithValue(message);
    }
  }
);

const contactsSlice = createSlice({
  name: "contacts",
  initialState,
  reducers: {
    clearContacts: (state) => {
      state.items = [];
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action: PayloadAction<Contact[]>) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch contacts";
      })
      .addCase(addContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addContact.fulfilled, (state, action: PayloadAction<Contact[]>) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(addContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to add contact";
      });
  },
});

export const { clearContacts, clearError } = contactsSlice.actions;
export default contactsSlice.reducer;
