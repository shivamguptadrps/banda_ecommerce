import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector } from "@/store/hooks";

interface LocationPickerProps {
  onPress: () => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ onPress }) => {
  const location = useAppSelector((state) => state.location.currentLocation);

  const displayText = location
    ? `${location.city}${location.area ? `, ${location.area}` : ""}`
    : "Select Location";

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.leftSection}>
        <Ionicons name="location" size={18} color="#22C55E" />
        <View style={styles.textContainer}>
          <Text style={styles.label}>Delivering to Home</Text>
          <Text style={styles.location} numberOfLines={1}>
            {displayText}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-down" size={18} color="#6B7280" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  textContainer: {
    flex: 1,
    marginLeft: 8,
  },
  label: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 1,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  location: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    letterSpacing: -0.2,
  },
});
