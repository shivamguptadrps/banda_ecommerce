import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useGetVendorProfileQuery,
  useUpdateVendorProfileMutation,
} from "@/store/api/vendorApi";
import { Spinner } from "@/components/ui/Spinner";

interface VendorSettingsScreenProps {
  onMenuPress?: () => void;
}

export default function VendorSettingsScreen({ onMenuPress }: VendorSettingsScreenProps = {}) {
  const { data: vendor, isLoading } = useGetVendorProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateVendorProfileMutation();

  const [formData, setFormData] = useState({
    shop_name: "",
    description: "",
    phone: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (vendor) {
      setFormData({
        shop_name: vendor.shop_name || "",
        description: vendor.description || "",
        phone: vendor.phone || "",
        address_line_1: vendor.address_line_1 || "",
        address_line_2: vendor.address_line_2 || "",
        city: vendor.city || "",
        state: vendor.state || "",
        pincode: vendor.pincode || "",
      });
      setIsDirty(false);
    }
  }, [vendor]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const validateForm = () => {
    if (!formData.shop_name || formData.shop_name.length < 2) {
      Alert.alert("Error", "Shop name must be at least 2 characters");
      return false;
    }
    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone)) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number");
      return false;
    }
    if (!formData.address_line_1 || formData.address_line_1.length < 5) {
      Alert.alert("Error", "Please enter address");
      return false;
    }
    if (!formData.city || formData.city.length < 2) {
      Alert.alert("Error", "City is required");
      return false;
    }
    if (!formData.state || formData.state.length < 2) {
      Alert.alert("Error", "State is required");
      return false;
    }
    if (!formData.pincode || !/^\d{6}$/.test(formData.pincode)) {
      Alert.alert("Error", "Please enter a valid 6-digit pincode");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      await updateProfile({
        shop_name: formData.shop_name,
        description: formData.description || undefined,
        phone: formData.phone || undefined,
        address_line_1: formData.address_line_1,
        address_line_2: formData.address_line_2 || undefined,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
      }).unwrap();
      Alert.alert("Success", "Settings saved successfully!");
      setIsDirty(false);
    } catch (error: any) {
      Alert.alert("Error", error.data?.detail || "Failed to save settings");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your shop settings</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Shop Profile */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="storefront-outline" size={20} color="#22C55E" />
            <Text style={styles.sectionTitle}>Shop Profile</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Shop Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.shop_name}
              onChangeText={(value) => handleChange("shop_name", value)}
              placeholder="Enter your shop name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => handleChange("description", value)}
              placeholder="Tell customers about your shop..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(value) => handleChange("phone", value)}
              placeholder="Enter phone number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
        </View>

        {/* Shop Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color="#22C55E" />
            <Text style={styles.sectionTitle}>Shop Address</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Address Line 1 *</Text>
            <TextInput
              style={styles.input}
              value={formData.address_line_1}
              onChangeText={(value) => handleChange("address_line_1", value)}
              placeholder="Shop no., Building name, Street"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Address Line 2 (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.address_line_2}
              onChangeText={(value) => handleChange("address_line_2", value)}
              placeholder="Landmark, Area"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                value={formData.city}
                onChangeText={(value) => handleChange("city", value)}
                placeholder="City"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>State *</Text>
              <TextInput
                style={styles.input}
                value={formData.state}
                onChangeText={(value) => handleChange("state", value)}
                placeholder="State"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Pincode *</Text>
            <TextInput
              style={styles.input}
              value={formData.pincode}
              onChangeText={(value) => handleChange("pincode", value)}
              placeholder="Pincode"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, (!isDirty || isUpdating) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!isDirty || isUpdating}
        >
          {isUpdating ? (
            <Spinner size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuButton: {
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  row: {
    flexDirection: "row",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
