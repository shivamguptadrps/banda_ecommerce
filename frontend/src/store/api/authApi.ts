import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_URL, ACCESS_TOKEN_KEY } from "@/lib/constants";
import { User, UserCreate, UserLogin, AuthTokens, UserUpdate, PasswordChange, MessageResponse } from "@/types";

/**
 * Auth API using RTK Query
 */
export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers) => {
      // Add auth token if available
      if (typeof window !== "undefined") {
        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
      }
      return headers;
    },
  }),
  tagTypes: ["User"],
  endpoints: (builder) => ({
    // Register new user
    register: builder.mutation<AuthTokens & { user: User }, UserCreate>({
      query: (data) => ({
        url: "/auth/register",
        method: "POST",
        body: data,
      }),
    }),

    // Login
    login: builder.mutation<AuthTokens & { user: User }, UserLogin>({
      query: (data) => ({
        url: "/auth/login",
        method: "POST",
        body: data,
      }),
    }),

    // Refresh token
    refreshToken: builder.mutation<AuthTokens, { refresh_token: string }>({
      query: (data) => ({
        url: "/auth/refresh",
        method: "POST",
        body: data,
      }),
    }),

    // Logout
    logout: builder.mutation<MessageResponse, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),

    // Get current user
    getCurrentUser: builder.query<User, void>({
      query: () => "/auth/me",
      providesTags: ["User"],
    }),

    // Update current user
    updateCurrentUser: builder.mutation<User, UserUpdate>({
      query: (data) => ({
        url: "/auth/me",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),

    // Change password
    changePassword: builder.mutation<MessageResponse, PasswordChange>({
      query: (data) => ({
        url: "/auth/change-password",
        method: "POST",
        body: data,
      }),
    }),

    // Send OTP
    sendOTP: builder.mutation<
      { message: string; expires_in: number; mobile_number: string; otp_code: string },
      { mobile_number: string; purpose?: string }
    >({
      query: (data) => ({
        url: "/auth/send-otp",
        method: "POST",
        body: { mobile_number: data.mobile_number, purpose: data.purpose || "login" },
      }),
    }),

    // Verify OTP
    verifyOTP: builder.mutation<AuthTokens & { user: User }, { mobile_number: string; otp: string; purpose?: string }>({
      query: (data) => ({
        url: "/auth/verify-otp",
        method: "POST",
        body: { mobile_number: data.mobile_number, otp: data.otp, purpose: data.purpose || "login" },
      }),
    }),

    // Register with password (after OTP verification)
    registerWithPassword: builder.mutation<
      AuthTokens & { user: User },
      { mobile_number: string; username: string; password: string; name: string; email?: string }
    >({
      query: (data) => ({
        url: "/auth/register-with-password",
        method: "POST",
        body: data,
      }),
    }),

    // Mobile login (mobile + password)
    mobileLogin: builder.mutation<AuthTokens & { user: User }, { mobile_number: string; password: string }>({
      query: (data) => ({
        url: "/auth/mobile-login",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
  useUpdateCurrentUserMutation,
  useChangePasswordMutation,
  useSendOTPMutation,
  useVerifyOTPMutation,
  useRegisterWithPasswordMutation,
  useMobileLoginMutation,
} = authApi;

