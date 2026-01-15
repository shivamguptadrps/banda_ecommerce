import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";
import { Cart, AddToCartRequest, UpdateCartItemRequest } from "@/types/product";

/**
 * Cart API using RTK Query
 */
export const cartApi = createApi({
  reducerPath: "cartApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Cart"],
  endpoints: (builder) => ({
    // Get current cart
    getCart: builder.query<Cart, void>({
      query: () => "/cart",
      providesTags: ["Cart"],
    }),

    // Add item to cart
    addToCart: builder.mutation<Cart, AddToCartRequest>({
      query: (data) => ({
        url: "/cart/items",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Cart"],
    }),

    // Update cart item quantity
    updateCartItem: builder.mutation<Cart, { itemId: string; data: UpdateCartItemRequest }>({
      query: ({ itemId, data }) => ({
        url: `/cart/items/${itemId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Cart"],
    }),

    // Remove item from cart
    removeFromCart: builder.mutation<Cart, string>({
      query: (itemId) => ({
        url: `/cart/items/${itemId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Cart"],
    }),

    // Clear cart
    clearCart: builder.mutation<void, void>({
      query: () => ({
        url: "/cart",
        method: "DELETE",
      }),
      invalidatesTags: ["Cart"],
    }),

    // Apply coupon
    applyCoupon: builder.mutation<Cart, { coupon_code: string }>({
      query: (data) => ({
        url: "/cart/apply-coupon",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Cart"],
    }),

    // Remove coupon
    removeCoupon: builder.mutation<Cart, void>({
      query: () => ({
        url: "/cart/remove-coupon",
        method: "DELETE",
      }),
      invalidatesTags: ["Cart"],
    }),
  }),
});

export const {
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
  useApplyCouponMutation,
  useRemoveCouponMutation,
} = cartApi;

