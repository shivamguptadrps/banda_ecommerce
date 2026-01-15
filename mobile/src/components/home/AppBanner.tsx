import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AppBannerProps {
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
}

export const AppBanner: React.FC<AppBannerProps> = ({
  onMenuPress,
  onNotificationPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Menu Button */}
        <TouchableOpacity
          onPress={onMenuPress}
          style={styles.iconButton}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>Banda</Text>
            <View style={styles.logoAccent}>
              <Text style={styles.logoAccentText}>Bazar</Text>
            </View>
          </View>
          <Text style={styles.tagline}>Quick Commerce</Text>
        </View>

        {/* Notification Button */}
        <TouchableOpacity
          onPress={onNotificationPress}
          style={styles.iconButton}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#7B2D8E",
    paddingTop: 44, // Reduced from 50 for narrower header
    paddingBottom: 10, // Reduced from 16
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 36, // Fixed height for consistent narrow header
  },
  iconButton: {
    width: 36, // Reduced from 40
    height: 36, // Reduced from 40
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderRadius: 8,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: 8,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 20, // Reduced from 26
    fontWeight: "700", // Reduced from 800
    color: "#FFFFFF",
    letterSpacing: 0.5, // Reduced from 1.5
    lineHeight: 24, // Reduced from 30
  },
  logoAccent: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 6, // Reduced from 8
    paddingVertical: 1, // Reduced from 2
    borderRadius: 3, // Reduced from 4
    marginLeft: 4, // Spacing between logo parts
  },
  logoAccentText: {
    fontSize: 14, // Reduced from 18
    fontWeight: "700", // Reduced from 800
    color: "#FFFFFF",
    letterSpacing: 0.3, // Reduced from 1
  },
  tagline: {
    fontSize: 9, // Reduced from 10
    fontWeight: "500", // Reduced from 600
    color: "#FFFFFF",
    letterSpacing: 0.8, // Reduced from 1.5
    marginTop: 1, // Reduced from 2
    opacity: 0.85, // Slightly reduced
  },
  badge: {
    position: "absolute",
    top: 6, // Adjusted
    right: 6, // Adjusted
    width: 7, // Slightly reduced
    height: 7, // Slightly reduced
    borderRadius: 3.5,
    backgroundColor: "#FF6B35",
    borderWidth: 1.5,
    borderColor: "#7B2D8E",
  },
  badgeDot: {
    width: 3, // Reduced
    height: 3, // Reduced
    borderRadius: 1.5,
    backgroundColor: "#FF6B35",
  },
});
