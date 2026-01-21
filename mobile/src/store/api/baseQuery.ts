import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_URL } from "@/lib/constants";
import { storage } from "@/lib/storage";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";

/**
 * Base query with authentication headers
 */
// Clean API URL to remove trailing slash
const cleanApiUrl = (url: string): string => {
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

export const baseQuery = fetchBaseQuery({
  baseUrl: cleanApiUrl(API_URL),
  // Follow redirects (307, 308) automatically
  fetchFn: async (url, options) => {
    const response = await fetch(url, {
      ...options,
      redirect: 'follow', // Follow redirects automatically
    });
    return response;
  },
  prepareHeaders: async (headers) => {
    // Add auth token if available
    const token = await storage.getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    headers.set("Content-Type", "application/json");
    return headers;
  },
});

// Enhanced logging wrapper for debugging - ALWAYS ENABLED
export const baseQueryWithLogging: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const url = typeof args === 'string' ? args : args.url || '';
  const fullUrl = `${cleanApiUrl(API_URL)}${url}`;
  
  // Always log - even in production
  console.log('🌐 API Request:', {
    method: typeof args === 'string' ? 'GET' : (args.method || 'GET'),
    url: fullUrl,
    baseUrl: cleanApiUrl(API_URL),
    endpoint: url,
  });
  
  const startTime = Date.now();
  // Use baseQueryWithReauth to handle token refresh
  const result = await baseQueryWithReauth(args, api, extraOptions);
  const duration = Date.now() - startTime;
  
  if (result.error) {
    console.error('❌ API Error:', {
      url: fullUrl,
      status: result.error.status,
      data: result.error.data,
      duration: `${duration}ms`,
      errorType: result.error.status === 'FETCH_ERROR' ? 'NETWORK_ERROR' : 'HTTP_ERROR',
    });
  } else {
    console.log('✅ API Success:', {
      url: fullUrl,
      duration: `${duration}ms`,
      dataSize: result.data ? JSON.stringify(result.data).length : 0,
      hasData: !!result.data,
    });
  }
  
  return result;
};

/**
 * Base query with re-authentication on 401
 * Only refreshes on 401 (Unauthorized), not on 403 (Forbidden)
 * 403 errors are permission issues, not token expiration issues
 */
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  // Only handle 401 (Unauthorized) - token expired or invalid
  // 403 (Forbidden) means user doesn't have permission, don't try to refresh
  if (result.error && result.error.status === 401) {
    const refreshToken = await storage.getRefreshToken();
    const user = await storage.getUser();
    
    // Only try to refresh if we have a refresh token
    // Don't refresh if this is already a refresh request (avoid infinite loop)
    const url = typeof args === 'string' ? args : args.url || '';
    const isRefreshRequest = url.includes('/auth/refresh') || url.includes('/refresh');
    
    if (refreshToken && !isRefreshRequest) {
      try {
        // Try to refresh token using the same endpoint for all users
        const refreshResult = await baseQuery(
          {
            url: "/auth/refresh",
            method: "POST",
            body: { refresh_token: refreshToken },
          },
          api,
          extraOptions
        );

        if (refreshResult.data) {
          const { access_token, refresh_token } = refreshResult.data as any;
          await storage.setAccessToken(access_token);
          await storage.setRefreshToken(refresh_token);

          // Retry original request with new token
          result = await baseQuery(args, api, extraOptions);
        } else {
          // Refresh failed, clear auth and logout
          // Only clear if it's not a delivery partner endpoint (they might have different error handling)
          const isDeliveryPartnerEndpoint = url.includes('/delivery-partner/');
          if (!isDeliveryPartnerEndpoint) {
            await storage.clearAuth();
          }
        }
      } catch (error) {
        // Refresh request itself failed, clear auth
        console.error("Token refresh failed:", error);
        await storage.clearAuth();
      }
    } else if (!refreshToken) {
      // No refresh token available, clear auth
      await storage.clearAuth();
    }
  }

  return result;
};

