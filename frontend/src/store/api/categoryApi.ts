import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";
import { Category, CategoryTreeNode, CategoryCreate, CategoryUpdate, PaginatedResponse, CategoryAttribute, CategoryAttributeListResponse } from "@/types";

/**
 * Category API using RTK Query
 */
export const categoryApi = createApi({
  reducerPath: "categoryApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Category"],
  endpoints: (builder) => ({
    // Get all categories (flat list)
    getCategories: builder.query<PaginatedResponse<Category>, { page?: number; size?: number }>({
      query: ({ page = 1, size = 50 }) => `/categories?page=${page}&size=${size}`,
      providesTags: ["Category"],
    }),

    // Get category tree
    getCategoryTree: builder.query<CategoryTreeNode[], void>({
      query: () => "/categories/tree",
      transformResponse: (response: { items: CategoryTreeNode[]; total: number }) => {
        return response.items || [];
      },
      providesTags: ["Category"],
    }),

    // Get root categories
    getRootCategories: builder.query<Category[], void>({
      query: () => "/categories/root",
      providesTags: ["Category"],
    }),

    // Get category by ID
    getCategoryById: builder.query<Category, string>({
      query: (id) => `/categories/${id}`,
      providesTags: (result, error, id) => [{ type: "Category", id }],
    }),

    // Get category by slug
    getCategoryBySlug: builder.query<Category, string>({
      query: (slug) => `/categories/slug/${slug}`,
      providesTags: (result) => result ? [{ type: "Category", id: result.id }] : [],
    }),

    // Get subcategories
    getSubcategories: builder.query<Category[], string>({
      query: (parentId) => `/categories/${parentId}/children`,
      providesTags: ["Category"],
    }),

    // Get category attributes (public endpoint for vendors/product forms)
    getCategoryAttributes: builder.query<CategoryAttributeListResponse, string>({
      query: (categoryId) => `/categories/${categoryId}/attributes`,
      providesTags: (result, error, categoryId) => [{ type: "Category", id: categoryId }],
    }),

    // Admin: Create category
    createCategory: builder.mutation<Category, CategoryCreate>({
      query: (data) => ({
        url: "/admin/categories",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Category"],
    }),

    // Admin: Update category
    updateCategory: builder.mutation<Category, { id: string; data: CategoryUpdate }>({
      query: ({ id, data }) => ({
        url: `/admin/categories/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Category"],
    }),

    // Admin: Delete category
    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Category"],
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
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi;

