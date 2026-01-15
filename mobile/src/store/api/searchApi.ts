import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";
import { ProductListResponse } from "@/types/product";

/**
 * Search API using RTK Query
 */
export interface SearchSuggestion {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  vendor: string | null;
  min_price: number | null;
  primary_image: string | null;
}

export interface SearchSuggestionsResponse {
  suggestions: SearchSuggestion[];
}

export interface SearchParams {
  query: string;
  category_id?: string;
  vendor_id?: string;
  min_price?: number;
  max_price?: number;
  in_stock_only?: boolean;
  sort_by?: "relevance" | "price_asc" | "price_desc" | "newest" | "rating";
  page?: number;
  size?: number;
}

export const searchApi = createApi({
  reducerPath: "searchApi",
  baseQuery,
  tagTypes: ["Search"],
  endpoints: (builder) => ({
    // Enhanced search with filters and sorting
    searchProducts: builder.query<ProductListResponse, SearchParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        searchParams.append("q", params.query);
        
        if (params.category_id) searchParams.append("category_id", params.category_id);
        if (params.vendor_id) searchParams.append("vendor_id", params.vendor_id);
        if (params.min_price !== undefined) searchParams.append("min_price", params.min_price.toString());
        if (params.max_price !== undefined) searchParams.append("max_price", params.max_price.toString());
        if (params.in_stock_only) searchParams.append("in_stock_only", "true");
        if (params.sort_by) searchParams.append("sort_by", params.sort_by);
        if (params.page) searchParams.append("page", params.page.toString());
        if (params.size) searchParams.append("size", params.size.toString());
        
        return `/search?${searchParams.toString()}`;
      },
      providesTags: ["Search"],
    }),

    // Get search suggestions/autocomplete
    getSearchSuggestions: builder.query<SearchSuggestionsResponse, { query: string; limit?: number }>({
      query: ({ query, limit = 10 }) => {
        const params = new URLSearchParams();
        params.append("q", query);
        if (limit) params.append("limit", limit.toString());
        return `/search/suggestions?${params.toString()}`;
      },
    }),
  }),
});

export const {
  useSearchProductsQuery,
  useLazySearchProductsQuery,
  useGetSearchSuggestionsQuery,
  useLazyGetSearchSuggestionsQuery,
} = searchApi;

