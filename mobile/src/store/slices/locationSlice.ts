import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  area?: string; // For backward compatibility
  address?: string; // For backward compatibility
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

const LOCATION_STORAGE_KEY = "banda_delivery_location";

/**
 * Load location from AsyncStorage
 */
const loadLocationFromStorage = async (): Promise<DeliveryLocation | null> => {
  try {
    const stored = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load location from storage:", error);
  }
  return null;
};

/**
 * Location Slice
 */
const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    setLocation: (state, action: PayloadAction<DeliveryLocation>) => {
      state.currentLocation = action.payload;
      state.error = null;
      state.isLoading = false;
      
      // Persist to AsyncStorage
      AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(action.payload)).catch(
        (error) => console.error("Failed to save location:", error)
      );
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
      
      AsyncStorage.removeItem(LOCATION_STORAGE_KEY).catch(
        (error) => console.error("Failed to clear location:", error)
      );
    },
    
    updateETA: (state, action: PayloadAction<{ etaMinutes: number; etaDisplay: string }>) => {
      if (state.currentLocation) {
        state.currentLocation.etaMinutes = action.payload.etaMinutes;
        state.currentLocation.etaDisplay = action.payload.etaDisplay;
      }
    },
    
    // Initialize location from storage (call this on app start)
    initializeLocation: (state, action: PayloadAction<DeliveryLocation | null>) => {
      if (action.payload) {
        state.currentLocation = action.payload;
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
  initializeLocation,
} = locationSlice.actions;

// Helper to load location on app start
export const loadStoredLocation = async () => {
  const location = await loadLocationFromStorage();
  return location;
};

export default locationSlice.reducer;

