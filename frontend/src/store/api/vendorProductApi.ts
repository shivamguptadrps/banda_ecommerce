import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";
import {
  Product,
  ProductCreate,
  ProductUpdate,
  SellUnit,
  SellUnitCreate,
  SellUnitUpdate,
  Inventory,
  InventoryUpdate,
  StockAdjustment,
  ProductListResponse,
  ProductImage,
} from "@/types";

/**
 * Product Image Create DTO
 */
export interface ProductImageCreate {
  image_url: string;
  display_order?: number;
  is_primary?: boolean;
}

/**
 * Vendor Product Response (with all details)
 */
export interface VendorProduct extends Product {
  primary_image?: string;
  min_price?: number;
  max_price?: number;
  is_in_stock: boolean;
}

/**
 * Vendor Product List Response
 */
export interface VendorProductListResponse {
  items: VendorProduct[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

/**
 * Vendor Product API
 */
export const vendorProductApi = createApi({
  reducerPath: "vendorProductApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["VendorProduct", "SellUnit", "Inventory"],
  endpoints: (builder) => ({
    // ============== Product CRUD ==============

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
        // Ensure trailing slash to match backend route
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

    // ============== Sell Units ==============

    // Add sell unit
    addSellUnit: builder.mutation<SellUnit, { productId: string; data: SellUnitCreate }>({
      query: ({ productId, data }) => ({
        url: `/vendor/products/${productId}/sell-units`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: "VendorProduct", id: productId },
      ],
    }),

    // Update sell unit
    updateSellUnit: builder.mutation<SellUnit, { productId: string; sellUnitId: string; data: SellUnitUpdate }>({
      query: ({ productId, sellUnitId, data }) => ({
        url: `/vendor/products/${productId}/sell-units/${sellUnitId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: "VendorProduct", id: productId },
      ],
    }),

    // Delete sell unit
    deleteSellUnit: builder.mutation<{ message: string }, { productId: string; sellUnitId: string }>({
      query: ({ productId, sellUnitId }) => ({
        url: `/vendor/products/${productId}/sell-units/${sellUnitId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: "VendorProduct", id: productId },
      ],
    }),

    // ============== Inventory ==============

    // Update inventory
    updateInventory: builder.mutation<Inventory, { productId: string; data: InventoryUpdate }>({
      query: ({ productId, data }) => ({
        url: `/vendor/products/${productId}/inventory`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: "VendorProduct", id: productId },
      ],
    }),

    // Adjust stock
    adjustStock: builder.mutation<Inventory, { productId: string; data: StockAdjustment }>({
      query: ({ productId, data }) => ({
        url: `/vendor/products/${productId}/inventory/adjust`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: "VendorProduct", id: productId },
      ],
    }),

    // ============== Product Images ==============

    // Add single image by URL
    addProductImage: builder.mutation<ProductImage, { productId: string; data: ProductImageCreate }>({
      query: ({ productId, data }) => ({
        url: `/vendor/products/${productId}/images/url`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: "VendorProduct", id: productId },
      ],
    }),

    // Add multiple images
    addProductImagesBulk: builder.mutation<ProductImage[], { productId: string; images: ProductImageCreate[] }>({
      query: ({ productId, images }) => ({
        url: `/vendor/products/${productId}/images/bulk`,
        method: "POST",
        body: images,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: "VendorProduct", id: productId },
      ],
    }),

    // Delete image
    deleteProductImage: builder.mutation<{ message: string }, { productId: string; imageId: string }>({
      query: ({ productId, imageId }) => ({
        url: `/vendor/products/${productId}/images/${imageId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: "VendorProduct", id: productId },
      ],
    }),

    // Set primary image
    setPrimaryImage: builder.mutation<{ message: string }, { productId: string; imageId: string }>({
      query: ({ productId, imageId }) => ({
        url: `/vendor/products/${productId}/images/${imageId}/primary`,
        method: "PUT",
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
  useAddSellUnitMutation,
  useUpdateSellUnitMutation,
  useDeleteSellUnitMutation,
  useUpdateInventoryMutation,
  useAdjustStockMutation,
  useAddProductImageMutation,
  useAddProductImagesBulkMutation,
  useDeleteProductImageMutation,
  useSetPrimaryImageMutation,
} = vendorProductApi;

