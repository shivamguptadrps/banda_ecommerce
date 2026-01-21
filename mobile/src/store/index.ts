import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import authReducer from "./slices/authSlice";
import locationReducer from "./slices/locationSlice";
import { authApi } from "./api/authApi";
import { categoryApi } from "./api/categoryApi";
import { productApi } from "./api/productApi";
import { cartApi } from "./api/cartApi";
import { addressApi } from "./api/addressApi";
import { orderApi } from "./api/orderApi";
import { paymentApi } from "./api/paymentApi";
import { returnApi } from "./api/returnApi";
import { refundApi } from "./api/refundApi";
import { uploadApi } from "./api/uploadApi";
import { searchApi } from "./api/searchApi";
import { deliveryPartnerApi } from "./api/deliveryPartnerApi";
import { vendorApi } from "./api/vendorApi";
import { vendorProductApi } from "./api/vendorProductApi";
import { locationApi } from "./api/locationApi";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    location: locationReducer,
    [authApi.reducerPath]: authApi.reducer,
    [categoryApi.reducerPath]: categoryApi.reducer,
    [productApi.reducerPath]: productApi.reducer,
    [cartApi.reducerPath]: cartApi.reducer,
    [addressApi.reducerPath]: addressApi.reducer,
    [orderApi.reducerPath]: orderApi.reducer,
    [paymentApi.reducerPath]: paymentApi.reducer,
    [returnApi.reducerPath]: returnApi.reducer,
    [refundApi.reducerPath]: refundApi.reducer,
    [uploadApi.reducerPath]: uploadApi.reducer,
    [searchApi.reducerPath]: searchApi.reducer,
    [deliveryPartnerApi.reducerPath]: deliveryPartnerApi.reducer,
    [vendorApi.reducerPath]: vendorApi.reducer,
    [vendorProductApi.reducerPath]: vendorProductApi.reducer,
    [locationApi.reducerPath]: locationApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ["persist/PERSIST"],
      },
    }).concat(
      authApi.middleware,
      categoryApi.middleware,
      productApi.middleware,
      cartApi.middleware,
      addressApi.middleware,
      orderApi.middleware,
      paymentApi.middleware,
      returnApi.middleware,
      refundApi.middleware,
      uploadApi.middleware,
      searchApi.middleware,
      deliveryPartnerApi.middleware,
      vendorApi.middleware,
      vendorProductApi.middleware,
      locationApi.middleware
    ),
});

// Enable refetchOnFocus and refetchOnReconnect
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

