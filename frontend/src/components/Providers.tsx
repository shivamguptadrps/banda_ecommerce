"use client";

import { ReactNode, useEffect } from "react";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import { store } from "@/store";
import { initializeAuth, selectIsAuthenticated } from "@/store/slices/authSlice";
import { useNotificationToasts } from "@/hooks/useNotificationToasts";

/**
 * Notification Toasts Handler
 * Shows toast notifications for critical notifications
 */
function NotificationToastsHandler() {
  useNotificationToasts();
  return null;
}

/**
 * App Providers
 * Wraps the app with Redux Provider and other providers
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <AuthInitializer />
      <NotificationToastsHandler />
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#333",
            color: "#fff",
            borderRadius: "8px",
            fontSize: "14px",
          },
          success: {
            iconTheme: {
              primary: "#22C55E",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#EF4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </Provider>
  );
}

/**
 * Auth Initializer
 * Initializes auth state from localStorage on app load
 */
function AuthInitializer() {
  useEffect(() => {
    store.dispatch(initializeAuth());
  }, []);

  return null;
}

