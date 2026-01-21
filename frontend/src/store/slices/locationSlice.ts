import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../index";

/**
 * Location State Types
 */
export interface DeliveryLocation {
  latitude: number;
  longitude: number;
  displayAddress: string;
  shortAddress: string;
  city: string;
  pincode: string;
  isServiceable: boolean;
  distanceKm: number;
  etaMinutes: number;
  etaDisplay: string;
}

interface LocationState {
  currentLocation: DeliveryLocation | null;
  isLoading: boolean;
  error: string | null;
  locationPermission: "granted" | "denied" | "prompt" | null;
}

const initialState: LocationState = {
  currentLocation: null,
  isLoading: false,
  error: null,
  locationPermission: null,
};

/**
 * Try to load location from localStorage
 */
const loadLocationFromStorage = (): DeliveryLocation | null => {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = localStorage.getItem("banda_delivery_location");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
};

/**
 * Location Slice
 */
const locationSlice = createSlice({
  name: "location",
  initialState: {
    ...initialState,
    currentLocation: loadLocationFromStorage(),
  },
  reducers: {
    setLocation: (state, action: PayloadAction<DeliveryLocation>) => {
      state.currentLocation = action.payload;
      state.error = null;
      state.isLoading = false;
      
      // Persist to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("banda_delivery_location", JSON.stringify(action.payload));
      }
    },
    
    setLocationLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setLocationError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    
    setLocationPermission: (state, action: PayloadAction<"granted" | "denied" | "prompt">) => {
      state.locationPermission = action.payload;
    },
    
    clearLocation: (state) => {
      state.currentLocation = null;
      state.error = null;
      
      if (typeof window !== "undefined") {
        localStorage.removeItem("banda_delivery_location");
      }
    },
    
    updateETA: (state, action: PayloadAction<{ etaMinutes: number; etaDisplay: string }>) => {
      if (state.currentLocation) {
        state.currentLocation.etaMinutes = action.payload.etaMinutes;
        state.currentLocation.etaDisplay = action.payload.etaDisplay;
      }
    },
  },
});

export const {
  setLocation,
  setLocationLoading,
  setLocationError,
  setLocationPermission,
  clearLocation,
  updateETA,
} = locationSlice.actions;

// Selectors
export const selectCurrentLocation = (state: RootState) => state.location.currentLocation;
export const selectLocationLoading = (state: RootState) => state.location.isLoading;
export const selectLocationError = (state: RootState) => state.location.error;
export const selectLocationPermission = (state: RootState) => state.location.locationPermission;
export const selectIsServiceable = (state: RootState) => state.location.currentLocation?.isServiceable ?? false;
export const selectETADisplay = (state: RootState) => state.location.currentLocation?.etaDisplay ?? null;

export default locationSlice.reducer;
