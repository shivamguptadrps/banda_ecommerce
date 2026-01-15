/**
 * Category Types
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  display_order: number;
  is_active: boolean;
  children?: CategoryTreeNode[];
}

export interface CategoryWithBreadcrumb extends Category {
  breadcrumb: Category[];
}

export interface CategoryListResponse {
  items: Category[];
  total: number;
}

export interface CategoryTreeResponse {
  items: CategoryTreeNode[];
  total: number;
}

