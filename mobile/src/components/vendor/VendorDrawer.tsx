import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { clearCredentials } from "@/store/slices/authSlice";
import { storage } from "@/lib/storage";

interface DrawerItem {
  label: string;
  screen: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const DRAWER_ITEMS: DrawerItem[] = [
  {
    label: "Dashboard",
    screen: "Dashboard",
    icon: "grid-outline",
  },
  {
    label: "Products",
    screen: "Products",
    icon: "cube-outline",
  },
  {
    label: "Orders",
    screen: "Orders",
    icon: "receipt-outline",
  },
  {
    label: "Settings",
    screen: "Settings",
    icon: "settings-outline",
  },
];

interface VendorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VendorDrawer({ isOpen, onClose }: VendorDrawerProps) {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  
  // Get current route name from navigation state
  let routeName: string | undefined;
  try {
    const navState = navigation.getState();
    if (navState) {
      const tabState = navState.routes.find((r: any) => r.name === "VendorTabs");
      if (tabState?.state) {
        routeName = tabState.state.routes[tabState.state.index]?.name;
      }
    }
  } catch (error) {
    // Fallback: try to get from navigation state hook
    try {
      routeName = useNavigationState((state: any) => {
        const tabRoute = state?.routes?.find((r: any) => r.name === "VendorTabs");
        return tabRoute?.state?.routes?.[tabRoute.state.index]?.name;
      });
    } catch (e) {
      // Ignore
    }
  }

  const handleLogout = async () => {
    try {
      const refreshToken = await storage.getRefreshToken();
      await storage.clearAuth();
      dispatch(clearCredentials());
      // Reset navigation to login - this clears all navigation state
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (error) {
      console.error("Logout error:", error);
      // Even on error, clear auth and try to navigate
      await storage.clearAuth();
      dispatch(clearCredentials());
      try {
        (navigation as any).navigate("Login");
      } catch (navError) {
        console.error("Navigation error:", navError);
      }
    }
  };

  const handleNavigate = (screen: string) => {
    // Navigate to the tab screen within VendorTabs
    navigation.navigate("VendorTabs", {
      screen,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Drawer */}
      <Animated.View style={styles.drawer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>V</Text>
            </View>
            <Text style={styles.headerTitle}>Vendor Portal</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Navigation Items */}
        <ScrollView style={styles.navContainer} showsVerticalScrollIndicator={false}>
          {DRAWER_ITEMS.map((item) => {
            const isActive = routeName === item.screen;
            return (
              <TouchableOpacity
                key={item.screen}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => handleNavigate(item.screen)}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={isActive ? "#FFFFFF" : "#6B7280"}
                />
                <Text
                  style={[
                    styles.navItemText,
                    isActive && styles.navItemTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* User Section */}
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name || "User"}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user?.email || ""}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={18} color="#6B7280" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 999,
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: "#FFFFFF",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingTop: 50,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  navContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: "#22C55E",
  },
  navItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  navItemTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  userSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: "#6B7280",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
});
