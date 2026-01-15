import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "./baseQuery";
import {
  Category,
  CategoryTreeNode,
  CategoryListResponse,
  CategoryTreeResponse,
  CategoryWithBreadcrumb,
} from "@/types/category";

/**
 * Category API using RTK Query
 */
export const categoryApi = createApi({
  reducerPath: "categoryApi",
  baseQuery,
  tagTypes: ["Category"],
  endpoints: (builder) => ({
    // Get all categories (flat list)
    getCategories: builder.query<CategoryListResponse, void>({
      query: () => "/categories",
      providesTags: ["Category"],
    }),

    // Get category tree
    getCategoryTree: builder.query<CategoryTreeResponse, void>({
      query: () => "/categories/tree",
      providesTags: ["Category"],
    }),

    // Get root categories
    getRootCategories: builder.query<Category[], void>({
      query: () => "/categories/root",
      providesTags: ["Category"],
    }),

    // Get category by ID
    getCategoryById: builder.query<CategoryWithBreadcrumb, string>({
      query: (id) => `/categories/${id}`,
      providesTags: (result, error, id) => [{ type: "Category", id }],
    }),

    // Get category by slug
    getCategoryBySlug: builder.query<CategoryWithBreadcrumb, string>({
      query: (slug) => `/categories/slug/${slug}`,
      providesTags: (result) => (result ? [{ type: "Category", id: result.id }] : []),
    }),

    // Get subcategories
    getSubcategories: builder.query<Category[], string>({
      query: (parentId) => `/categories/${parentId}/children`,
      providesTags: ["Category"],
    }),

    // Get category attributes (for dynamic features)
    getCategoryAttributes: builder.query<any, string>({
      query: (categoryId) => `/categories/${categoryId}/attributes`,
      providesTags: ["Category"],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetCategoryTreeQuery,
  useGetRootCategoriesQuery,
  useGetCategoryByIdQuery,
  useGetCategoryBySlugQuery,
  useGetSubcategoriesQuery,
  useGetCategoryAttributesQuery,
} = categoryApi;
