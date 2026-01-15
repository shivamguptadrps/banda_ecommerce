import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { clearCredentials, updateUser } from "@/store/slices/authSlice";
import { useLogoutMutation, useUpdateCurrentUserMutation } from "@/store/api/authApi";
import { storage } from "@/lib/storage";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [updateCurrentUser, { isLoading: isUpdating }] = useUpdateCurrentUserMutation();
  
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const performLogout = async () => {
    console.log("🔄 performLogout STARTED");
    try {
      console.log("📝 Step 1: Getting refresh token...");
      const refreshToken = await storage.getRefreshToken();
      console.log("📝 Refresh token:", refreshToken ? "Found" : "Not found");
      
      console.log("🧹 Step 2: Clearing storage...");
      await storage.clearAuth();
      console.log("✅ Storage cleared");
      
      console.log("🔄 Step 3: Dispatching clearCredentials...");
      dispatch(clearCredentials());
      console.log("✅ Redux state cleared");
      
      // Try to call logout API (fire and forget)
      if (refreshToken) {
        console.log("🌐 Step 4: Calling logout API...");
        logout({ refresh_token: refreshToken }).unwrap().catch((err: any) => {
          console.error("❌ Logout API error:", err);
        });
      }
      
      console.log("🏠 Step 5: Navigating to Home...");
      // Navigate to Home tab (product listing)
      setTimeout(() => {
        try {
          console.log("📍 Attempting CommonActions.reset...");
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [
                {
                  name: "MainTabs",
                  state: {
                    routes: [{ name: "Home" }],
                    index: 0,
                  },
                },
              ],
            })
          );
          console.log("✅ Navigation successful");
        } catch (navError: any) {
          console.error("❌ CommonActions failed:", navError);
          try {
            console.log("🔄 Trying simple navigate...");
            (navigation as any).navigate("MainTabs", { screen: "Home" });
            console.log("✅ Simple navigate successful");
          } catch (e: any) {
            console.error("❌ Simple navigate failed:", e);
            try {
              console.log("🔄 Trying goBack...");
              (navigation as any).goBack();
            } catch (goBackErr: any) {
              console.error("❌ All navigation methods failed:", goBackErr);
            }
          }
        }
      }, 200);
    } catch (error: any) {
      console.error("❌ performLogout ERROR:", error);
      // Even if there's an error, clear local auth
      await storage.clearAuth();
      dispatch(clearCredentials());
      setTimeout(() => {
        try {
          (navigation as any).navigate("MainTabs", { screen: "Home" });
        } catch (navError) {
          (navigation as any).goBack();
        }
      }, 200);
    }
    console.log("✅ performLogout COMPLETED");
  };

  const alertInteractionRef = useRef(false);
  
  const handleLogout = () => {
    console.log("🔘 handleLogout called");
    alertInteractionRef.current = false;
    
    try {
      Alert.alert(
        "Logout",
        "Are you sure you want to logout?",
        [
          { 
            text: "Cancel", 
            style: "cancel",
            onPress: () => {
              alertInteractionRef.current = true;
              console.log("❌ User cancelled");
            }
          },
          {
            text: "Logout",
            style: "destructive",
            onPress: () => {
              alertInteractionRef.current = true;
              console.log("✅ User confirmed - calling performLogout");
              performLogout();
            },
          },
        ],
        { cancelable: true, onDismiss: () => { alertInteractionRef.current = true; } }
      );
      console.log("✅ Alert.alert called");
      
      // Fallback: If Alert doesn't show (React Native Web issue), logout after 2 seconds
      setTimeout(() => {
        if (!alertInteractionRef.current) {
          console.log("⚠️ Alert didn't show or user didn't interact (likely React Native Web issue) - logging out directly");
          performLogout();
        }
      }, 2000);
    } catch (alertError: any) {
      console.error("❌ Alert.alert failed:", alertError);
      // If Alert fails, logout directly
      console.log("🔄 Alert failed, logging out directly...");
      performLogout();
    }
  };

  const handleEditPress = () => {
    if (user) {
      setEditName(user.name);
      setEditPhone(user.phone);
      setIsEditModalVisible(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    if (!editName.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    if (!editPhone.trim() || !/^[6-9]\d{9}$/.test(editPhone)) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number starting with 6-9");
      return;
    }

    try {
      const updatedUser = await updateCurrentUser({
        name: editName.trim(),
        phone: editPhone.trim(),
      }).unwrap();
      
      dispatch(updateUser(updatedUser));
      setIsEditModalVisible(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error: any) {
      Alert.alert("Error", error.data?.detail || "Failed to update profile");
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isAuthenticated && user ? (
            <>
              {/* User Info Card */}
              <View style={styles.userCard}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {user.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editAvatarButton}
                    onPress={handleEditPress}
                  >
                    <Ionicons name="create-outline" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={styles.roleBadge}>
                  <Ionicons name="shield-checkmark-outline" size={12} color="#FFFFFF" />
                  <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
                </View>
              </View>

              {/* Info Section */}
              <View style={styles.infoSection}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="call-outline" size={16} color="#22C55E" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Phone Number</Text>
                    <Text style={styles.infoValue}>{user.phone}</Text>
                  </View>
                </View>
              </View>

              {/* Menu Section */}
              <View style={styles.menuSection}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleEditPress}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconContainer, { backgroundColor: "#D1FAE5" }]}>
                      <Ionicons name="create-outline" size={16} color="#22C55E" />
                    </View>
                    <Text style={styles.menuText}>Edit Profile</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => navigation.navigate("AddressList" as never)}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconContainer, { backgroundColor: "#D1FAE5" }]}>
                      <Ionicons name="location-outline" size={16} color="#22C55E" />
                    </View>
                    <Text style={styles.menuText}>My Addresses</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => (navigation as any).navigate("ReturnRequests")}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconContainer, { backgroundColor: "#D1FAE5" }]}>
                      <Ionicons name="return-down-back-outline" size={16} color="#22C55E" />
                    </View>
                    <Text style={styles.menuText}>Return Requests</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIconContainer, { backgroundColor: "#D1FAE5" }]}>
                      <Ionicons name="settings-outline" size={16} color="#22C55E" />
                    </View>
                    <Text style={styles.menuText}>Settings</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {/* Logout Button */}
              <TouchableOpacity
                style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
                onPress={() => {
                  console.log("🔴 LOGOUT BUTTON PRESSED - isLoggingOut:", isLoggingOut);
                  if (!isLoggingOut) {
                    handleLogout();
                  } else {
                    console.log("⚠️ Logout already in progress, ignoring press");
                  }
                }}
                disabled={isLoggingOut}
                activeOpacity={0.7}
              >
                {isLoggingOut ? (
                  <>
                    <Spinner size="small" color="#FFFFFF" />
                    <Text style={styles.logoutText}>Logging out...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.logoutText}>Logout</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.notLoggedInContainer}>
              <View style={styles.notLoggedInIconContainer}>
                <Ionicons name="person-outline" size={48} color="#22C55E" />
              </View>
              <Text style={styles.notLoggedInTitle}>You're not logged in</Text>
              <Text style={styles.notLoggedInSubtitle}>
                Please login to access your profile, cart, and orders
              </Text>
              <View style={styles.loginButtons}>
                <Button
                  onPress={() => (navigation as any).navigate("Login")}
                  style={styles.loginButton}
                >
                  Login
                </Button>
                <Button
                  onPress={() => (navigation as any).navigate("Register")}
                  variant="outline"
                  style={styles.registerButton}
                >
                  Register
                </Button>
              </View>

              <View style={styles.deliveryPartnerSection}>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>
                <TouchableOpacity
                  style={styles.deliveryPartnerButton}
                  onPress={() => (navigation as any).navigate("DeliveryPartnerLogin")}
                >
                  <Ionicons name="car-outline" size={18} color="#22C55E" />
                  <Text style={styles.deliveryPartnerText}>Delivery Partner Login</Text>
                </TouchableOpacity>
                <Text style={styles.deliveryPartnerHint}>
                  Login with phone number and OTP
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Edit Profile Modal */}
        <Modal
          visible={isEditModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsEditModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setIsEditModalVisible(false)}
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity
                  onPress={() => setIsEditModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Name <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Enter your name"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Phone Number <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="9876543210"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                  <Text style={styles.inputHint}>10 digits starting with 6-9</Text>
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsEditModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveProfile}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Spinner size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22C55E",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  infoSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  menuSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22C55E",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    marginHorizontal: 4,
    gap: 6,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 10,
    minHeight: 44,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    minHeight: 400,
  },
  notLoggedInIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  notLoggedInTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  notLoggedInSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  loginButtons: {
    width: "100%",
    gap: 12,
  },
  loginButton: {
    width: "100%",
  },
  registerButton: {
    width: "100%",
  },
  deliveryPartnerSection: {
    marginTop: 24,
    width: "100%",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  deliveryPartnerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  deliveryPartnerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#22C55E",
  },
  deliveryPartnerHint: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  required: {
    color: "#EF4444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  inputHint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  saveButton: {
    backgroundColor: "#22C55E",
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
