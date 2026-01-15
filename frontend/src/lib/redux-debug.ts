/**
 * Redux Debug Utilities
 * Helper functions to inspect Redux state in development
 */

/**
 * Get cart state from Redux store
 * Use this in browser console: window.__REDUX_STORE__.getState().cart
 */
export const getCartState = () => {
  if (typeof window === "undefined") return null;
  
  // Access Redux store if available
  const store = (window as any).__REDUX_STORE__;
  if (!store) {
    console.warn("Redux store not found. Make sure Redux DevTools is installed.");
    return null;
  }
  
  const state = store.getState();
  return {
    cart: state.cart, // Local cart slice
    cartApi: state.cartApi, // Backend cart API
  };
};

/**
 * Log current cart state to console
 */
export const logCartState = () => {
  const cartState = getCartState();
  if (cartState) {
    console.log("=== Redux Cart State ===");
    console.log("Local Cart (cart slice):", cartState.cart);
    console.log("Backend Cart (cartApi):", cartState.cartApi);
    console.log("LocalStorage Cart:", localStorage.getItem("cart"));
  }
};


