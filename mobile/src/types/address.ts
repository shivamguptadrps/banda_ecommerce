/**
 * Address Types for Mobile App
 */

export interface Address {
  id: string;
  buyer_id: string;
  label: string;
  recipient_name: string;
  recipient_phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  full_address?: string;
}

export interface AddressCreate {
  label: string;
  recipient_name: string;
  recipient_phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
}

export interface AddressUpdate {
  label?: string;
  recipient_name?: string;
  recipient_phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
}

export interface AddressListResponse {
  items: Address[];
  total: number;
}

