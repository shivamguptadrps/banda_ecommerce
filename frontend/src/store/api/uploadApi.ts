import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

export interface ProductImageUploadResponse {
  url: string;
  public_id?: string;
}

export interface ProductImageUploadListResponse {
  images: ProductImageUploadResponse[];
}

/**
 * Upload API using RTK Query
 */
export const uploadApi = createApi({
  reducerPath: "uploadApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Upload"],
  endpoints: (builder) => ({
    // Upload return request images
    uploadReturnRequestImages: builder.mutation<string[], File[]>({
      query: (files) => {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append("files", file);
        });
        
        return {
          url: "/upload/return-request-images",
          method: "POST",
          body: formData,
          // Don't set Content-Type - browser will set it with boundary
          prepareHeaders: (headers: Headers) => {
            headers.delete("Content-Type");
            return headers;
          },
        };
      },
    }),

    // Upload product images (vendor only)
    uploadProductImages: builder.mutation<ProductImageUploadListResponse, File[]>({
      query: (files) => {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append("files", file);
        });
        
        return {
          url: "/upload/product-images",
          method: "POST",
          body: formData,
          // Don't set Content-Type - browser will set it with boundary
          prepareHeaders: (headers: Headers) => {
            headers.delete("Content-Type");
            return headers;
          },
        };
      },
    }),
  }),
});

export const { 
  useUploadReturnRequestImagesMutation,
  useUploadProductImagesMutation,
} = uploadApi;

