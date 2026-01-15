/**
 * Type Exports
 */

export * from "./user";
export * from "./category";
export * from "./vendor";
export * from "./product";
export * from "./attribute";

/**
 * Common Types
 */

export interface ApiError {
  detail: string;
  status_code?: number;
}

export interface MessageResponse {
  message: string;
}

export interface PaginationParams {
  page?: number;
  size?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

/**
 * Form Types
 */
export interface SelectOption {
  label: string;
  value: string;
}
