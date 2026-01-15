/**
 * Shared Base Query with Global 401 Error Handling
 * Automatically logs out users on 401 Unauthorized responses
 */

import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { API_URL, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from "@/lib/constants";
import { ROUTES } from "@/lib/constants";
import toast from "react-hot-toast";
import { logout } from "../slices/authSlice";

/**
 * Get user role from localStorage to determine redirect path
 */
const getUserRole = (): string | null => {
  if (typeof window === "undefined") return null;
  
  try {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      const user = JSON.parse(userStr);
      return user?.role || null;
    }
  } catch {
    // Ignore parse errors
  }
  
  return null;
};

/**
 * Clear authentication data and redirect to login
 */
const handleUnauthorized = () => {
  if (typeof window === "undefined") return;
  
  // Get user role BEFORE clearing localStorage
  const role = getUserRole();
  
  // Determine redirect path based on user role
  let redirectPath: string = ROUTES.LOGIN;
  
  if (role === "admin") {
    redirectPath = ROUTES.ADMIN_LOGIN;
  } else if (role === "vendor") {
    redirectPath = ROUTES.VENDOR_LOGIN;
  } else if (role === "delivery_partner") {
    redirectPath = ROUTES.DELIVERY_PARTNER_LOGIN;
  }
  
  // Clear all auth data
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  
  // Show toast notification
  if (typeof window !== "undefined") {
    toast.error("Your session has expired. Please login again.", {
      duration: 4000,
      icon: "🔒",
    });
  }
  
  // Redirect to login page
  // Use setTimeout to avoid navigation during render
  setTimeout(() => {
    window.location.href = redirectPath;
  }, 100);
};

/**
 * Base query with 401 error handling
 */
export const baseQuery = fetchBaseQuery({
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
});

/**
 * Base query with automatic 401 handling and logout
 */
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  
  // Handle 401 Unauthorized
  if (result.error && result.error.status === 401) {
    // Only handle logout if we're not already on a login page
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      const isLoginPage = 
        currentPath.includes("/login") || 
        currentPath.includes("/auth");
      
      if (!isLoginPage) {
        // Dispatch logout action to clear Redux state
        api.dispatch(logout());
        
        // Clear localStorage and redirect
        handleUnauthorized();
      }
    }
  }
  
  return result;
};

