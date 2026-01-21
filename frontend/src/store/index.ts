import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

import authReducer from "./slices/authSlice";
import cartReducer from "./slices/cartSlice";
import locationReducer from "./slices/locationSlice";
import { authApi } from "./api/authApi";
import { locationApi } from "./api/locationApi";
import { categoryApi } from "./api/categoryApi";
import { vendorApi } from "./api/vendorApi";
import { productApi } from "./api/productApi";
import { cartApi } from "./api/cartApi";
import { adminApi } from "./api/adminApi";
import { vendorProductApi } from "./api/vendorProductApi";
import { orderApi } from "./api/orderApi";
import { paymentApi } from "./api/paymentApi";
import { addressApi } from "./api/addressApi";
import { deliveryPartnerApi } from "./api/deliveryPartnerApi";
import { notificationApi } from "./api/notificationApi";
import { returnApi } from "./api/returnApi";
import { refundApi } from "./api/refundApi";
import { uploadApi } from "./api/uploadApi";
import { searchApi } from "./api/searchApi";
import { analyticsApi } from "./api/analyticsApi";

/**
 * Redux Store Configuration
 */
export const store = configureStore({
  reducer: {
    // Slices
    auth: authReducer,
    cart: cartReducer,
    location: locationReducer,

    // API reducers
    [authApi.reducerPath]: authApi.reducer,
    [locationApi.reducerPath]: locationApi.reducer,
    [categoryApi.reducerPath]: categoryApi.reducer,
    [vendorApi.reducerPath]: vendorApi.reducer,
    [productApi.reducerPath]: productApi.reducer,
    [cartApi.reducerPath]: cartApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [vendorProductApi.reducerPath]: vendorProductApi.reducer,
    [orderApi.reducerPath]: orderApi.reducer,
    [paymentApi.reducerPath]: paymentApi.reducer,
    [addressApi.reducerPath]: addressApi.reducer,
    [deliveryPartnerApi.reducerPath]: deliveryPartnerApi.reducer,
    [notificationApi.reducerPath]: notificationApi.reducer,
    [returnApi.reducerPath]: returnApi.reducer,
    [refundApi.reducerPath]: refundApi.reducer,
    [uploadApi.reducerPath]: uploadApi.reducer,
    [searchApi.reducerPath]: searchApi.reducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }).concat(
      authApi.middleware,
      locationApi.middleware,
      categoryApi.middleware,
      vendorApi.middleware,
      productApi.middleware,
      cartApi.middleware,
      adminApi.middleware,
      vendorProductApi.middleware,
      orderApi.middleware,
      paymentApi.middleware,
      addressApi.middleware,
      deliveryPartnerApi.middleware,
      notificationApi.middleware,
      returnApi.middleware,
      refundApi.middleware,
      uploadApi.middleware,
      searchApi.middleware,
      analyticsApi.middleware
    ),
  devTools: process.env.NODE_ENV !== "production",
});

// Setup listeners for refetchOnFocus/refetchOnReconnect
setupListeners(store.dispatch);

// Expose store to window for debugging (development only, client-side only)
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  // Use setTimeout to ensure this runs after hydration
  setTimeout(() => {
    (window as any).__REDUX_STORE__ = store;
  }, 0);
}

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
