import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";
import {
  Address,
  AddressCreate,
  AddressUpdate,
  AddressListResponse,
} from "@/types/address";

/**
 * Address API using RTK Query
 */
export const addressApi = createApi({
  reducerPath: "addressApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Address"],
  endpoints: (builder) => ({
    // Get all addresses
    getAddresses: builder.query<AddressListResponse, void>({
      query: () => "/addresses",
      providesTags: ["Address"],
    }),

    // Get address by ID
    getAddress: builder.query<Address, string>({
      query: (addressId) => `/addresses/${addressId}`,
      providesTags: (result, error, addressId) => [{ type: "Address", id: addressId }],
    }),

    // Create address
    createAddress: builder.mutation<Address, AddressCreate>({
      query: (data) => ({
        url: "/addresses",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Address"],
    }),

    // Update address
    updateAddress: builder.mutation<Address, { addressId: string; data: AddressUpdate }>({
      query: ({ addressId, data }) => ({
        url: `/addresses/${addressId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { addressId }) => [{ type: "Address", id: addressId }],
    }),

    // Delete address
    deleteAddress: builder.mutation<void, string>({
      query: (addressId) => ({
        url: `/addresses/${addressId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Address"],
    }),

    // Set default address
    setDefaultAddress: builder.mutation<Address, string>({
      query: (addressId) => ({
        url: `/addresses/${addressId}/default`,
        method: "PUT",
      }),
      invalidatesTags: ["Address"],
    }),
  }),
});

export const {
  useGetAddressesQuery,
  useGetAddressQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
  useSetDefaultAddressMutation,
} = addressApi;

