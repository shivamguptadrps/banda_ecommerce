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
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at?: string;
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

export interface CategoryCreate {
  name: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  display_order?: number;
}

export interface CategoryUpdate {
  name?: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  is_active?: boolean;
  display_order?: number;
}

export interface CategoryBreadcrumb {
  id: string;
  name: string;
  slug: string;
}

