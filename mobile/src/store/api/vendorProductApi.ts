import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";
import { Product, SellUnit, Inventory } from "@/types/product";

export interface ProductImageCreate {
  image_url: string;
  display_order?: number;
  is_primary?: boolean;
}

export interface ProductCreate {
  name: string;
  description?: string;
  category_id?: string;
  stock_unit: string;
  initial_stock?: number;
  low_stock_threshold?: number;
  sell_units: Array<{
    label: string;
    unit_value: number;
    price: number;
    compare_price?: number;
  }>;
  return_eligible: boolean;
  return_window_days?: number;
  return_conditions?: string;
}

export interface ProductUpdate {
  name?: string;
  description?: string;
  category_id?: string;
  stock_unit?: string;
  is_active?: boolean;
  return_eligible?: boolean;
  return_window_days?: number;
  return_conditions?: string;
}

export interface SellUnitCreate {
  label: string;
  unit_value: number;
  price: number;
  compare_price?: number;
}

export interface SellUnitUpdate {
  label?: string;
  unit_value?: number;
  price?: number;
  compare_price?: number;
  is_active?: boolean;
}

export interface InventoryUpdate {
  available_quantity?: number;
  low_stock_threshold?: number;
}

export interface StockAdjustment {
  quantity: number;
  reason?: string;
}

export interface VendorProduct extends Product {
  primary_image?: string;
  min_price?: number;
  max_price?: number;
  is_in_stock: boolean;
}

export interface VendorProductListResponse {
  items: VendorProduct[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export const vendorProductApi = createApi({
  reducerPath: "vendorProductApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["VendorProduct", "SellUnit", "Inventory"],
  endpoints: (builder) => ({
    // Get vendor's products
    getVendorProducts: builder.query<
      VendorProductListResponse,
      { page?: number; size?: number; search?: string; category_id?: string; is_active?: boolean }
    >({
      query: ({ page = 1, size = 20, search, category_id, is_active }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("size", size.toString());
        if (search) params.append("search", search);
        if (category_id) params.append("category_id", category_id);
        if (is_active !== undefined) params.append("is_active", is_active.toString());
        return `/vendor/products/?${params.toString()}`;
      },
      providesTags: ["VendorProduct"],
    }),

    // Get single product
    getVendorProduct: builder.query<VendorProduct, string>({
      query: (id) => `/vendor/products/${id}`,
      providesTags: (result, error, id) => [{ type: "VendorProduct", id }],
    }),

    // Create product
    createProduct: builder.mutation<VendorProduct, ProductCreate>({
      query: (data) => ({
        url: "/vendor/products/",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["VendorProduct"],
    }),

    // Update product
    updateProduct: builder.mutation<VendorProduct, { id: string; data: ProductUpdate }>({
      query: ({ id, data }) => ({
        url: `/vendor/products/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "VendorProduct", id },
        "VendorProduct",
      ],
    }),

    // Delete product
    deleteProduct: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/vendor/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["VendorProduct"],
    }),

    // Add multiple images
    addProductImagesBulk: builder.mutation<any[], { productId: string; images: ProductImageCreate[] }>({
      query: ({ productId, images }) => ({
        url: `/vendor/products/${productId}/images/bulk`,
        method: "POST",
        body: images,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: "VendorProduct", id: productId },
      ],
    }),
  }),
});

export const {
  useGetVendorProductsQuery,
  useGetVendorProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useAddProductImagesBulkMutation,
} = vendorProductApi;
