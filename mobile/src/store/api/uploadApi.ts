import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

/**
 * Upload API using RTK Query
 */
export const uploadApi = createApi({
  reducerPath: "uploadApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Upload"],
  endpoints: (builder) => ({
    // Upload return request images
    uploadReturnRequestImages: builder.mutation<string[], FormData>({
      query: (formData) => ({
        url: "/upload/return-request-images",
        method: "POST",
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary
        prepareHeaders: (headers) => {
          // Remove Content-Type to let browser set it with multipart/form-data boundary
          headers.delete("Content-Type");
          return headers;
        },
      }),
    }),
  }),
});

export const { useUploadReturnRequestImagesMutation } = uploadApi;

