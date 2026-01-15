/**
 * Attribute Types
 * Type definitions for category attributes and product attribute values
 */

/**
 * Attribute type options
 */
export type AttributeType = "text" | "number" | "select" | "multi_select" | "boolean";

/**
 * Category Attribute - defines what attributes products in a category should have
 */
export interface CategoryAttribute {
  id: string;
  category_id: string;
  segment_id?: string;
  name: string;
  slug: string;
  description?: string;
  attribute_type: AttributeType;
  options?: string[];
  unit?: string;
  is_required: boolean;
  is_inherited: boolean;
  is_filterable: boolean;
  is_searchable: boolean;
  display_order: number;
  show_in_listing: boolean;
  show_in_details: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  
  // Additional fields from API
  category_name?: string;
  segment_name?: string;
  is_own?: boolean;  // true if belongs to current category, false if inherited
}

/**
 * Create category attribute request
 */
export interface CategoryAttributeCreate {
  category_id: string;
  segment_id?: string;
  name: string;
  description?: string;
  attribute_type: AttributeType;
  options?: string[];
  unit?: string;
  is_required?: boolean;
  is_inherited?: boolean;
  is_filterable?: boolean;
  is_searchable?: boolean;
  display_order?: number;
  show_in_listing?: boolean;
  show_in_details?: boolean;
}

/**
 * Update category attribute request
 */
export interface CategoryAttributeUpdate {
  name?: string;
  description?: string;
  attribute_type?: AttributeType;
  options?: string[];
  unit?: string;
  is_required?: boolean;
  is_inherited?: boolean;
  is_filterable?: boolean;
  is_searchable?: boolean;
  display_order?: number;
  show_in_listing?: boolean;
  show_in_details?: boolean;
  is_active?: boolean;
  segment_id?: string;
}

/**
 * Category attribute list response
 */
export interface CategoryAttributeListResponse {
  items: CategoryAttribute[];
  total: number;
}

/**
 * Product attribute value - stores the actual attribute value for a product
 */
export interface ProductAttributeValue {
  id: string;
  product_id?: string;
  attribute_id: string;
  value: string;
  value_json?: string[];
  
  // Additional display fields
  attribute_name?: string;
  attribute_slug?: string;
  attribute_type?: AttributeType;
  value_display?: string;
  unit?: string;
  segment_id?: string;
  segment_name?: string;
  show_in_listing?: boolean;
  show_in_details?: boolean;
}

/**
 * Create/Update product attribute value
 */
export interface ProductAttributeValueCreate {
  attribute_id: string;
  value: string;
  value_json?: string[];
}

/**
 * Filter option with count (for filter sidebar)
 */
export interface AttributeFilterOption {
  value: string;
  count: number;
}

/**
 * Group of filter options for an attribute
 */
export interface AttributeFilterGroup {
  attribute_id: string;
  attribute_name: string;
  attribute_slug: string;
  attribute_type: AttributeType;
  options: AttributeFilterOption[];
}

/**
 * All available filter options for a category
 */
export interface CategoryFilterOptions {
  category_id: string;
  category_name: string;
  attributes: AttributeFilterGroup[];
}

/**
 * Attribute filter selection (for product filtering)
 */
export interface AttributeFilter {
  attribute_id: string;
  values: string[];
}

/**
 * Attribute type display info
 */
export const ATTRIBUTE_TYPE_INFO: Record<AttributeType, { label: string; icon: string; description: string }> = {
  text: {
    label: "Text",
    icon: "Type",
    description: "Free text input (e.g., Processor name)",
  },
  number: {
    label: "Number",
    icon: "Hash",
    description: "Numeric value with optional unit (e.g., 8 GB)",
  },
  select: {
    label: "Single Select",
    icon: "List",
    description: "Choose one option from a list (e.g., RAM size)",
  },
  multi_select: {
    label: "Multi Select",
    icon: "CheckSquare",
    description: "Choose multiple options (e.g., Connectivity: WiFi, Bluetooth, NFC)",
  },
  boolean: {
    label: "Yes/No",
    icon: "ToggleLeft",
    description: "Toggle for boolean values (e.g., Has NFC)",
  },
};

/**
 * Attribute Segment - groups attributes into logical segments
 */
export interface AttributeSegment {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  icon?: string;
  display_order: number;
  is_collapsible: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  attribute_count?: number;
}

/**
 * Attribute Segment with attributes
 */
export interface AttributeSegmentWithAttributes extends AttributeSegment {
  attributes: CategoryAttribute[];
}

/**
 * Create attribute segment request
 */
export interface AttributeSegmentCreate {
  category_id: string;
  name: string;
  description?: string;
  icon?: string;
  display_order?: number;
  is_collapsible?: boolean;
}

/**
 * Update attribute segment request
 */
export interface AttributeSegmentUpdate {
  name?: string;
  description?: string;
  icon?: string;
  display_order?: number;
  is_collapsible?: boolean;
  is_active?: boolean;
}

/**
 * Attribute segment list response
 */
export interface AttributeSegmentListResponse {
  items: AttributeSegment[];
  total: number;
}


