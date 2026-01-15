import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../index";
import { Cart, CartItem, Product, SellUnit } from "@/types/product";
import { CART_KEY } from "@/lib/constants";

/**
 * Local cart item for guest users
 */
interface LocalCartItem {
  productId: string;
  sellUnitId: string;
  quantity: number;
  product: Product;
  sellUnit: SellUnit;
}

interface CartState {
  items: LocalCartItem[];
  isOpen: boolean;
  isLoading: boolean;
}

// Load cart from localStorage
const loadCartFromStorage = (): LocalCartItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save cart to localStorage
const saveCartToStorage = (items: LocalCartItem[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
};

const initialState: CartState = {
  items: [],
  isOpen: false,
  isLoading: false,
};

/**
 * Cart Slice
 */
const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Initialize cart from localStorage
    initializeCart: (state) => {
      state.items = loadCartFromStorage();
    },

    // Add item to cart
    addItem: (state, action: PayloadAction<LocalCartItem>) => {
      const { productId, sellUnitId, quantity, product, sellUnit } = action.payload;
      const existingIndex = state.items.findIndex(
        (item) => item.productId === productId && item.sellUnitId === sellUnitId
      );

      if (existingIndex >= 0) {
        state.items[existingIndex].quantity += quantity;
      } else {
        state.items.push({ productId, sellUnitId, quantity, product, sellUnit });
      }
      saveCartToStorage(state.items);
    },

    // Update item quantity
    updateItemQuantity: (
      state,
      action: PayloadAction<{ productId: string; sellUnitId: string; quantity: number }>
    ) => {
      const { productId, sellUnitId, quantity } = action.payload;
      const index = state.items.findIndex(
        (item) => item.productId === productId && item.sellUnitId === sellUnitId
      );

      if (index >= 0) {
        if (quantity <= 0) {
          state.items.splice(index, 1);
        } else {
          state.items[index].quantity = quantity;
        }
        saveCartToStorage(state.items);
      }
    },

    // Remove item from cart
    removeItem: (
      state,
      action: PayloadAction<{ productId: string; sellUnitId: string }>
    ) => {
      const { productId, sellUnitId } = action.payload;
      state.items = state.items.filter(
        (item) => !(item.productId === productId && item.sellUnitId === sellUnitId)
      );
      saveCartToStorage(state.items);
    },

    // Clear entire cart
    clearCart: (state) => {
      state.items = [];
      saveCartToStorage([]);
    },

    // Toggle cart drawer
    toggleCart: (state) => {
      state.isOpen = !state.isOpen;
    },

    // Open cart drawer
    openCart: (state) => {
      state.isOpen = true;
    },

    // Close cart drawer
    closeCart: (state) => {
      state.isOpen = false;
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  initializeCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  toggleCart,
  openCart,
  closeCart,
  setLoading,
} = cartSlice.actions;

// Selectors
export const selectCartItems = (state: RootState) => state.cart.items;
export const selectCartIsOpen = (state: RootState) => state.cart.isOpen;
export const selectCartIsLoading = (state: RootState) => state.cart.isLoading;

export const selectCartItemCount = (state: RootState) =>
  state.cart.items.reduce((total, item) => total + item.quantity, 0);

export const selectCartTotal = (state: RootState) =>
  state.cart.items.reduce(
    (total, item) => total + item.sellUnit.price * item.quantity,
    0
  );

export const selectCartItemByProduct = (
  state: RootState,
  productId: string,
  sellUnitId: string
) =>
  state.cart.items.find(
    (item) => item.productId === productId && item.sellUnitId === sellUnitId
  );

export default cartSlice.reducer;

