import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";
import {
  Product,
  ProductFilters,
  ProductListResponse,
  SearchSuggestion,
} from "@/types/product";

/**
 * Product API using RTK Query
 */
export const productApi = createApi({
  reducerPath: "productApi",
  baseQuery,
  tagTypes: ["Product"],
  endpoints: (builder) => ({
    // Get products with filters
    getProducts: builder.query<
      ProductListResponse,
      { page?: number; size?: number; filters?: ProductFilters }
    >({
      query: ({ page = 1, size = 20, filters = {} }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("size", size.toString());

        if (filters.category_id) params.append("category_id", filters.category_id);
        if (filters.vendor_id) params.append("vendor_id", filters.vendor_id);
        if (filters.search) params.append("search", filters.search);
        if (filters.min_price) params.append("min_price", filters.min_price.toString());
        if (filters.max_price) params.append("max_price", filters.max_price.toString());
        if (filters.in_stock !== undefined) {
          params.append("in_stock_only", filters.in_stock.toString());
        }

        return `/products?${params.toString()}`;
      },
      providesTags: ["Product"],
    }),

    // Get product by ID
    getProductById: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: "Product", id }],
    }),

    // Get product by slug
    getProductBySlug: builder.query<Product, string>({
      query: (slug) => `/products/slug/${slug}`,
      providesTags: (result) =>
        result ? [{ type: "Product", id: result.id }] : [],
    }),

    // Get products by category
    getProductsByCategory: builder.query<
      ProductListResponse,
      { categoryId: string; page?: number; size?: number; inStockOnly?: boolean }
    >({
      query: ({ categoryId, page = 1, size = 20, inStockOnly = false }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("size", size.toString());
        if (inStockOnly) params.append("in_stock_only", "true");
        return `/products/category/${categoryId}?${params.toString()}`;
      },
      providesTags: ["Product"],
    }),

    // Search products
    searchProducts: builder.query<
      ProductListResponse,
      { query: string; page?: number; size?: number; categoryId?: string }
    >({
      query: ({ query, page = 1, size = 20, categoryId }) => {
        const params = new URLSearchParams();
        params.append("q", query);
        params.append("page", page.toString());
        params.append("size", size.toString());
        if (categoryId) params.append("category_id", categoryId);
        return `/products/search?${params.toString()}`;
      },
      providesTags: ["Product"],
    }),

    // Get search suggestions
    getSearchSuggestions: builder.query<
      { suggestions: SearchSuggestion[] },
      { query: string; limit?: number }
    >({
      query: ({ query, limit = 10 }) =>
        `/products/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`,
    }),

    // Get products by vendor
    getProductsByVendor: builder.query<
      ProductListResponse,
      { vendorId: string; page?: number; size?: number; categoryId?: string }
    >({
      query: ({ vendorId, page = 1, size = 20, categoryId }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("size", size.toString());
        if (categoryId) params.append("category_id", categoryId);
        return `/products/vendor/${vendorId}?${params.toString()}`;
      },
      providesTags: ["Product"],
    }),

    // Get featured products
    getFeaturedProducts: builder.query<Product[], void>({
      query: () => "/products/featured",
      providesTags: ["Product"],
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
  useGetProductsByVendorQuery,
  useGetFeaturedProductsQuery,
} = productApi;

