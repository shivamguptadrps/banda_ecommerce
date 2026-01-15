import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

/**
 * Address Types
 */
export interface Address {
  id: string;
  buyer_id: string;
  label: string;
  recipient_name: string;
  recipient_phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  full_address?: string;
}

export interface AddressCreate {
  label: string;
  recipient_name: string;
  recipient_phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
}

export interface AddressUpdate {
  label?: string;
  recipient_name?: string;
  recipient_phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
}

export interface AddressListResponse {
  items: Address[];
  total: number;
}

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

