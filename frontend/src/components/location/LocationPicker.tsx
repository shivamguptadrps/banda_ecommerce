"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Navigation,
  Search,
  X,
  ChevronRight,
  Home,
  Briefcase,
  Clock,
  AlertCircle,
  Loader2,
  Check,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setLocation,
  setLocationLoading,
  setLocationError,
  setLocationPermission,
  selectCurrentLocation,
  selectLocationLoading,
  selectLocationError,
  DeliveryLocation,
} from "@/store/slices/locationSlice";
import {
  useCheckServiceabilityMutation,
  useLazyReverseGeocodeQuery,
} from "@/store/api/locationApi";
import { useGetAddressesQuery } from "@/store/api/addressApi";
import { selectIsAuthenticated } from "@/store/slices/authSlice";
import { cn } from "@/lib/utils";

interface LocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LocationPicker({ isOpen, onClose }: LocationPickerProps) {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentLocation = useAppSelector(selectCurrentLocation);
  const isLoading = useAppSelector(selectLocationLoading);
  const error = useAppSelector(selectLocationError);

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [checkServiceability] = useCheckServiceabilityMutation();
  const [triggerReverseGeocode] = useLazyReverseGeocodeQuery();

  // Fetch saved addresses if authenticated
  const { data: addressesData } = useGetAddressesQuery(undefined, {
    skip: !isAuthenticated,
  });

  const savedAddresses = addressesData?.items || [];

  // Handle GPS location detection
  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      dispatch(setLocationError("Geolocation is not supported by your browser"));
      return;
    }

    setDetectingLocation(true);
    dispatch(setLocationLoading(true));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        dispatch(setLocationPermission("granted"));

        try {
          // Check serviceability
          const serviceResult = await checkServiceability({
            latitude,
            longitude,
          }).unwrap();

          // Reverse geocode to get address
          const geocodeResult = await triggerReverseGeocode({
            lat: latitude,
            lon: longitude,
          }).unwrap();

          const location: DeliveryLocation = {
            latitude,
            longitude,
            displayAddress: geocodeResult.display_name,
            shortAddress: `${geocodeResult.address.neighbourhood || geocodeResult.address.road}, ${geocodeResult.address.city}`,
            city: geocodeResult.address.city,
            pincode: geocodeResult.address.postcode,
            isServiceable: serviceResult.serviceable,
            distanceKm: serviceResult.distance_km,
            etaMinutes: serviceResult.estimated_delivery_minutes,
            etaDisplay: serviceResult.serviceable
              ? getETADisplay(serviceResult.estimated_delivery_minutes)
              : "Not available",
          };

          dispatch(setLocation(location));

          if (!serviceResult.serviceable) {
            dispatch(
              setLocationError(
                `Sorry, we don't deliver to this location yet (${serviceResult.distance_km} km away). We deliver within ${serviceResult.max_delivery_radius_km} km.`
              )
            );
          } else {
            onClose();
          }
        } catch (err: any) {
          dispatch(setLocationError(err?.data?.detail || "Failed to verify location"));
        }

        setDetectingLocation(false);
        dispatch(setLocationLoading(false));
      },
      (err) => {
        setDetectingLocation(false);
        dispatch(setLocationLoading(false));

        if (err.code === err.PERMISSION_DENIED) {
          dispatch(setLocationPermission("denied"));
          dispatch(
            setLocationError(
              "Location access denied. Please enable location in your browser settings."
            )
          );
        } else {
          dispatch(setLocationError("Failed to get your location. Please try again."));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Handle selecting a saved address
  const handleSelectSavedAddress = async (address: any) => {
    if (!address.latitude || !address.longitude) {
      dispatch(setLocationError("This address doesn't have coordinates. Please update it."));
      return;
    }

    dispatch(setLocationLoading(true));

    try {
      const serviceResult = await checkServiceability({
        latitude: parseFloat(address.latitude),
        longitude: parseFloat(address.longitude),
      }).unwrap();

      const location: DeliveryLocation = {
        latitude: parseFloat(address.latitude),
        longitude: parseFloat(address.longitude),
        displayAddress: address.full_address,
        shortAddress: `${address.address_line_1}, ${address.city}`,
        city: address.city,
        pincode: address.pincode,
        isServiceable: serviceResult.serviceable,
        distanceKm: serviceResult.distance_km,
        etaMinutes: serviceResult.estimated_delivery_minutes,
        etaDisplay: serviceResult.serviceable
          ? getETADisplay(serviceResult.estimated_delivery_minutes)
          : "Not available",
      };

      dispatch(setLocation(location));

      if (!serviceResult.serviceable) {
        dispatch(
          setLocationError(
            `Sorry, this address is outside our delivery area (${serviceResult.distance_km} km away).`
          )
        );
      } else {
        onClose();
      }
    } catch (err: any) {
      dispatch(setLocationError(err?.data?.detail || "Failed to verify address"));
    }

    dispatch(setLocationLoading(false));
  };

  // Get ETA display string
  const getETADisplay = (minutes: number): string => {
    if (minutes <= 10) return "8-10 min";
    if (minutes <= 15) return "10-15 min";
    if (minutes <= 20) return "15-20 min";
    if (minutes <= 30) return "20-30 min";
    return `${minutes - 5}-${minutes + 5} min`;
  };

  // Get icon for address label
  const getAddressIcon = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel === "home") return Home;
    if (lowerLabel === "office" || lowerLabel === "work") return Briefcase;
    return MapPin;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Select Delivery Location</h2>
              <p className="text-sm text-gray-500">We deliver within 10 km radius</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2"
              >
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}

            {/* Detect Location Button */}
            <button
              onClick={handleDetectLocation}
              disabled={detectingLocation}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all",
                detectingLocation
                  ? "border-green-300 bg-green-50"
                  : "border-green-400 hover:border-green-500 hover:bg-green-50"
              )}
            >
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                {detectingLocation ? (
                  <Loader2 className="h-5 w-5 text-green-600 animate-spin" />
                ) : (
                  <Navigation className="h-5 w-5 text-green-600" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">
                  {detectingLocation ? "Detecting location..." : "Use Current Location"}
                </p>
                <p className="text-sm text-gray-500">Using GPS</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>

            {/* Search Box */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for area, street name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Saved Addresses */}
            {isAuthenticated && savedAddresses.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Saved Addresses
                </h3>
                <div className="space-y-2">
                  {savedAddresses.map((address: any) => {
                    const IconComponent = getAddressIcon(address.label);
                    const isSelected =
                      currentLocation?.latitude === parseFloat(address.latitude) &&
                      currentLocation?.longitude === parseFloat(address.longitude);

                    return (
                      <button
                        key={address.id}
                        onClick={() => handleSelectSavedAddress(address)}
                        disabled={isLoading}
                        className={cn(
                          "w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left",
                          isSelected
                            ? "border-green-500 bg-green-50"
                            : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        <div
                          className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0",
                            isSelected ? "bg-green-100" : "bg-gray-100"
                          )}
                        >
                          <IconComponent
                            className={cn(
                              "h-4 w-4",
                              isSelected ? "text-green-600" : "text-gray-500"
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{address.label}</p>
                            {address.is_default && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {address.address_line_1}
                          </p>
                          <p className="text-xs text-gray-400">
                            {address.city}, {address.pincode}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Current Location Info */}
            {currentLocation && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">Current Selection</span>
                </div>
                <p className="text-sm text-gray-600">{currentLocation.shortAddress}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {currentLocation.etaDisplay}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">
                      {currentLocation.distanceKm} km away
                    </span>
                  </div>
                  {currentLocation.isServiceable ? (
                    <span className="text-xs text-green-600 font-medium">✓ Serviceable</span>
                  ) : (
                    <span className="text-xs text-red-600 font-medium">✗ Not serviceable</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              Delivery available within 10 km of our warehouse in Ghaziabad
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
