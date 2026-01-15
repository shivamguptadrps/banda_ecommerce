import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";
import {
  Product,
  ProductCreate,
  ProductUpdate,
  ProductFilters,
  ProductListResponse,
  SellUnit,
  Inventory,
} from "@/types/product";

/**
 * Product API using RTK Query
 */
export const productApi = createApi({
  reducerPath: "productApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Product", "VendorProduct"],
  endpoints: (builder) => ({
    // Public: Get products with filters
    getProducts: builder.query<ProductListResponse, { page?: number; size?: number; filters?: ProductFilters }>({
      query: ({ page = 1, size = 12, filters = {} }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("size", size.toString());
        
        if (filters.category_id) params.append("category_id", filters.category_id);
        if (filters.vendor_id) params.append("vendor_id", filters.vendor_id);
        if (filters.search) params.append("search", filters.search);
        if (filters.min_price) params.append("min_price", filters.min_price.toString());
        if (filters.max_price) params.append("max_price", filters.max_price.toString());
        if (filters.in_stock !== undefined) {
          // Backend expects in_stock_only as boolean query param
          params.append("in_stock_only", filters.in_stock.toString());
        }
        // Note: sort_by is handled automatically by backend based on search query
        
        return `/products?${params.toString()}`;
      },
      providesTags: ["Product"],
    }),

    // Public: Get product by ID
    getProductById: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: "Product", id }],
    }),

    // Public: Get product by slug
    getProductBySlug: builder.query<Product, string>({
      query: (slug) => `/products/slug/${slug}`,
      providesTags: (result) => result ? [{ type: "Product", id: result.id }] : [],
    }),

    // Public: Get products by category
    getProductsByCategory: builder.query<ProductListResponse, { categoryId: string; page?: number; size?: number }>({
      query: ({ categoryId, page = 1, size = 12 }) => `/products/category/${categoryId}?page=${page}&size=${size}`,
      providesTags: ["Product"],
    }),

    // Public: Search products
    searchProducts: builder.query<ProductListResponse, { query: string; page?: number; size?: number }>({
      query: ({ query, page = 1, size = 12 }) => `/products/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`,
      providesTags: ["Product"],
    }),

    // Public: Get search suggestions/autocomplete
    getSearchSuggestions: builder.query<
      { suggestions: Array<{ id: string; name: string; slug: string; category: string | null; vendor: string | null; min_price: number | null; primary_image: string | null }> },
      { query: string; limit?: number }
    >({
      query: ({ query, limit = 10 }) => `/products/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`,
    }),

    // Public: Get featured products
    getFeaturedProducts: builder.query<Product[], void>({
      query: () => "/products/featured",
      providesTags: ["Product"],
    }),

    // Vendor: Get my products
    getVendorProducts: builder.query<ProductListResponse, { page?: number; size?: number; status?: string }>({
      query: ({ page = 1, size = 20, status }) => {
        let url = `/vendor/products?page=${page}&size=${size}`;
        if (status) url += `&status=${status}`;
        return url;
      },
      providesTags: ["VendorProduct"],
    }),

    // Vendor: Create product
    createProduct: builder.mutation<Product, ProductCreate>({
      query: (data) => ({
        url: "/vendor/products",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["VendorProduct", "Product"],
    }),

    // Vendor: Update product
    updateProduct: builder.mutation<Product, { id: string; data: ProductUpdate }>({
      query: ({ id, data }) => ({
        url: `/vendor/products/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["VendorProduct", "Product"],
    }),

    // Vendor: Delete product
    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: `/vendor/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["VendorProduct", "Product"],
    }),

    // Vendor: Add sell unit
    addSellUnit: builder.mutation<SellUnit, { productId: string; data: Omit<SellUnit, "id" | "product_id"> }>({
      query: ({ productId, data }) => ({
        url: `/vendor/products/${productId}/sell-units`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["VendorProduct", "Product"],
    }),

    // Vendor: Update inventory
    updateInventory: builder.mutation<Inventory, { productId: string; quantity: number }>({
      query: ({ productId, quantity }) => ({
        url: `/vendor/products/${productId}/inventory`,
        method: "PUT",
        body: { available_quantity: quantity },
      }),
      invalidatesTags: ["VendorProduct", "Product"],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useGetProductBySlugQuery,
  useGetProductsByCategoryQuery,
  useSearchProductsQuery,
  useGetSearchSuggestionsQuery,
  useGetFeaturedProductsQuery,
  useGetVendorProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useAddSellUnitMutation,
  useUpdateInventoryMutation,
} = productApi;

