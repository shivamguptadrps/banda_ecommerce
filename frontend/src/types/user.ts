/**
 * User Types
 */

export type UserRole = "admin" | "vendor" | "buyer" | "delivery_partner";

export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  is_verified?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserCreate {
  email: string;
  phone: string;
  name: string;
  password: string;
  role: "vendor" | "buyer";
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserUpdate {
  name?: string;
  phone?: string;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

