import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
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

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentLocation = useAppSelector(selectCurrentLocation);
  const isLoading = useAppSelector(selectLocationLoading);
  const error = useAppSelector(selectLocationError);

  const [detectingLocation, setDetectingLocation] = useState(false);

  const [checkServiceability] = useCheckServiceabilityMutation();
  const [triggerReverseGeocode] = useLazyReverseGeocodeQuery();

  // Fetch saved addresses if authenticated
  const { data: addressesData } = useGetAddressesQuery(undefined, {
    skip: !isAuthenticated,
  });

  const savedAddresses = addressesData?.items || [];

  // Get ETA display string
  const getETADisplay = (minutes: number): string => {
    if (minutes <= 10) return "8-10 min";
    if (minutes <= 15) return "10-15 min";
    if (minutes <= 20) return "15-20 min";
    if (minutes <= 30) return "20-30 min";
    return `${minutes - 5}-${minutes + 5} min`;
  };

  // Handle GPS location detection
  const handleDetectLocation = async () => {
    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== "granted") {
        dispatch(setLocationPermission("denied"));
        dispatch(setLocationError("Location permission denied. Please enable location in settings."));
        Alert.alert(
          "Permission Denied",
          "Please enable location access in your device settings to use this feature."
        );
        return;
      }

      dispatch(setLocationPermission("granted"));
      setDetectingLocation(true);
      dispatch(setLocationLoading(true));

      // Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = position.coords;

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
          Alert.alert(
            "Location Not Serviceable",
            `This location is ${serviceResult.distance_km} km away. We currently deliver within ${serviceResult.max_delivery_radius_km} km only.`
          );
        } else {
          onClose();
        }
      } catch (err: any) {
        dispatch(setLocationError(err?.data?.detail || "Failed to verify location"));
        Alert.alert("Error", err?.data?.detail || "Failed to verify location");
      }

      setDetectingLocation(false);
      dispatch(setLocationLoading(false));
    } catch (error: any) {
      setDetectingLocation(false);
      dispatch(setLocationLoading(false));
      dispatch(setLocationError("Failed to get your location. Please try again."));
      Alert.alert("Error", "Failed to get your location. Please try again.");
    }
  };

  // Handle selecting a saved address
  const handleSelectSavedAddress = async (address: any) => {
    if (!address.latitude || !address.longitude) {
      Alert.alert(
        "Address Error",
        "This address doesn't have coordinates. Please update it."
      );
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
        Alert.alert(
          "Location Not Serviceable",
          `This address is outside our delivery area (${serviceResult.distance_km} km away).`
        );
      } else {
        onClose();
      }
    } catch (err: any) {
      Alert.alert("Error", err?.data?.detail || "Failed to verify address");
    }

    dispatch(setLocationLoading(false));
  };

  // Get icon for address label
  const getAddressIcon = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel === "home") return "home";
    if (lowerLabel === "office" || lowerLabel === "work") return "briefcase";
    return "location";
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Select Delivery Location</Text>
              <Text style={styles.headerSubtitle}>We deliver within 10 km radius</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Detect Location Button */}
            <TouchableOpacity
              onPress={handleDetectLocation}
              disabled={detectingLocation}
              style={[
                styles.detectButton,
                detectingLocation && styles.detectButtonActive,
              ]}
            >
              <View style={styles.detectButtonIcon}>
                {detectingLocation ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : (
                  <Ionicons name="navigate" size={20} color="#10B981" />
                )}
              </View>
              <View style={styles.detectButtonText}>
                <Text style={styles.detectButtonTitle}>
                  {detectingLocation ? "Detecting location..." : "Use Current Location"}
                </Text>
                <Text style={styles.detectButtonSubtitle}>Using GPS</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Saved Addresses */}
            {isAuthenticated && savedAddresses.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>SAVED ADDRESSES</Text>
                {savedAddresses.map((address: any) => {
                  const iconName = getAddressIcon(address.label);
                  const isSelected =
                    currentLocation?.latitude === parseFloat(address.latitude) &&
                    currentLocation?.longitude === parseFloat(address.longitude);

                  return (
                    <TouchableOpacity
                      key={address.id}
                      onPress={() => handleSelectSavedAddress(address)}
                      disabled={isLoading}
                      style={[
                        styles.addressCard,
                        isSelected && styles.addressCardSelected,
                      ]}
                    >
                      <View
                        style={[
                          styles.addressIcon,
                          isSelected && styles.addressIconSelected,
                        ]}
                      >
                        <Ionicons
                          name={iconName}
                          size={16}
                          color={isSelected ? "#10B981" : "#6B7280"}
                        />
                      </View>
                      <View style={styles.addressInfo}>
                        <View style={styles.addressHeader}>
                          <Text style={styles.addressLabel}>{address.label}</Text>
                          {address.is_default && (
                            <View style={styles.defaultBadge}>
                              <Text style={styles.defaultBadgeText}>Default</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.addressLine} numberOfLines={1}>
                          {address.address_line_1}
                        </Text>
                        <Text style={styles.addressCity}>
                          {address.city}, {address.pincode}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Current Location Info */}
            {currentLocation && (
              <View style={styles.currentLocationCard}>
                <View style={styles.currentLocationHeader}>
                  <Ionicons name="location" size={16} color="#10B981" />
                  <Text style={styles.currentLocationTitle}>Current Selection</Text>
                </View>
                <Text style={styles.currentLocationAddress}>
                  {currentLocation.shortAddress}
                </Text>
                <View style={styles.currentLocationDetails}>
                  <View style={styles.currentLocationDetail}>
                    <Ionicons name="time-outline" size={14} color="#6B7280" />
                    <Text style={styles.currentLocationDetailText}>
                      {currentLocation.etaDisplay}
                    </Text>
                  </View>
                  <Text style={styles.currentLocationDetailText}>
                    {currentLocation.distanceKm} km away
                  </Text>
                  {currentLocation.isServiceable ? (
                    <Text style={styles.serviceableBadge}>✓ Serviceable</Text>
                  ) : (
                    <Text style={styles.notServiceableBadge}>✗ Not serviceable</Text>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Delivery available within 10 km of our warehouse in Ghaziabad
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#F0FDF4",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#DC2626",
  },
  detectButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#10B981",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
  },
  detectButtonActive: {
    backgroundColor: "#F0FDF4",
    borderColor: "#34D399",
  },
  detectButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  detectButtonText: {
    flex: 1,
    marginLeft: 12,
  },
  detectButtonTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  detectButtonSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  addressCardSelected: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  addressIconSelected: {
    backgroundColor: "#D1FAE5",
  },
  addressInfo: {
    flex: 1,
    marginLeft: 12,
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  defaultBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#059669",
  },
  addressLine: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
  },
  addressCity: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  currentLocationCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  currentLocationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  currentLocationTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  currentLocationAddress: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 8,
  },
  currentLocationDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  currentLocationDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  currentLocationDetailText: {
    fontSize: 11,
    color: "#6B7280",
  },
  serviceableBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
  },
  notServiceableBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#DC2626",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#F9FAFB",
  },
  footerText: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
  },
});
