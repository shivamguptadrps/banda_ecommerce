import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Location {
  city: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

interface LocationState {
  currentLocation: Location | null;
  isLoading: boolean;
}

const initialState: LocationState = {
  currentLocation: null,
  isLoading: false,
};

const LOCATION_STORAGE_KEY = "banda_location";

const locationSlice = createSlice({
  name: "location",
  initialState,
  reducers: {
    setLocation: (state, action: PayloadAction<Location>) => {
      state.currentLocation = action.payload;
      // Location persistence can be added later if needed
    },
    clearLocation: (state) => {
      state.currentLocation = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setLocation, clearLocation, setLoading } = locationSlice.actions;
export default locationSlice.reducer;

