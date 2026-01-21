import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "@/types/user";
import { storage } from "@/lib/storage";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; tokens: { access_token: string; refresh_token: string } }>) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
      // Store tokens synchronously (fire and forget - they're async but we don't need to wait)
      // The baseQuery will read from storage when making requests
      storage.setAccessToken(action.payload.tokens.access_token).catch(console.error);
      storage.setRefreshToken(action.payload.tokens.refresh_token).catch(console.error);
      storage.setUser(action.payload.user).catch(console.error);
    },
    clearCredentials: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      // Clear tokens
      storage.clearAuth();
      // Note: RTK Query cache will be cleared by resetting NavigationContainer key in App.tsx
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      storage.setUser(action.payload);
    },
  },
});

export const { setCredentials, clearCredentials, setError, setLoading, updateUser } = authSlice.actions;
export default authSlice.reducer;

