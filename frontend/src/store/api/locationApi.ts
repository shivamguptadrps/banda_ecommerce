import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

/**
 * Location API Types
 */
export interface LocationCheckRequest {
  latitude: number;
  longitude: number;
}

export interface LocationCheckResponse {
  serviceable: boolean;
  distance_km: number;
  estimated_delivery_minutes: number;
  warehouse_name: string;
  max_delivery_radius_km: number;
  message: string;
}

export interface ETARequest {
  latitude: number;
  longitude: number;
}

export interface ETAResponse {
  distance_km: number;
  travel_time_minutes: number;
  prep_time_minutes: number;
  total_eta_minutes: number;
  eta_display: string;
}

export interface WarehouseInfo {
  name: string;
  latitude: number;
  longitude: number;
  max_delivery_radius_km: number;
  base_prep_time_minutes: number;
}

export interface ReverseGeocodeResponse {
  success: boolean;
  display_name: string;
  address: {
    house_number: string;
    road: string;
    neighbourhood: string;
    city: string;
    town?: string;
    state: string;
    postcode: string;
    country: string;
  };
  latitude: number;
  longitude: number;
}

/**
 * Location API
 */
export const locationApi = createApi({
  reducerPath: "locationApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    // Check if location is serviceable
    checkServiceability: builder.mutation<LocationCheckResponse, LocationCheckRequest>({
      query: (data) => ({
        url: "/location/check-serviceability",
        method: "POST",
        body: data,
      }),
    }),

    // Calculate ETA for a location
    calculateETA: builder.mutation<ETAResponse, ETARequest>({
      query: (data) => ({
        url: "/location/calculate-eta",
        method: "POST",
        body: data,
      }),
    }),

    // Get warehouse info
    getWarehouseInfo: builder.query<WarehouseInfo, void>({
      query: () => "/location/warehouse",
    }),

    // Reverse geocode coordinates to address
    reverseGeocode: builder.query<ReverseGeocodeResponse, { lat: number; lon: number }>({
      query: ({ lat, lon }) => `/location/reverse-geocode?lat=${lat}&lon=${lon}`,
    }),
  }),
});

export const {
  useCheckServiceabilityMutation,
  useCalculateETAMutation,
  useGetWarehouseInfoQuery,
  useLazyReverseGeocodeQuery,
} = locationApi;
