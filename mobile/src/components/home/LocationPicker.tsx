import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector } from "@/store/hooks";
import { LocationPickerModal } from "@/components/location/LocationPickerModal";

interface LocationPickerProps {
  onPress?: () => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ onPress }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const location = useAppSelector((state) => state.location.currentLocation);

  const displayText = location
    ? location.shortAddress || `${location.city}${location.area ? `, ${location.area}` : ""}`
    : "Select Location";

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setModalVisible(true);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
        <View style={styles.leftSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="location" size={18} color="#10B981" />
          </View>
          <View style={styles.textContainer}>
            {location ? (
              <>
                <View style={styles.etaRow}>
                  <Ionicons name="time-outline" size={12} color="#6B7280" />
                  <Text style={styles.etaText}>Delivery in {location.etaDisplay}</Text>
                </View>
                <Text style={styles.location} numberOfLines={1}>
                  {displayText}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>Deliver to</Text>
                <Text style={styles.location} numberOfLines={1}>
                  {displayText}
                </Text>
              </>
            )}
          </View>
        </View>
        <Ionicons name="chevron-down" size={18} color="#6B7280" />
      </TouchableOpacity>
      
      <LocationPickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
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
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
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
  etaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  etaText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
  },
});
