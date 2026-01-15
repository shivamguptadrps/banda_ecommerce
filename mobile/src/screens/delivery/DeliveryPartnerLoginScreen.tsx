import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useLoginMutation } from "@/store/api/deliveryPartnerApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { Spinner } from "@/components/ui/Spinner";

export default function DeliveryPartnerLoginScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [login, { isLoading }] = useLoginMutation();

  const handleSubmit = async () => {
    if (!phone || !otp) {
      Alert.alert("Missing Fields", "Please enter phone number and OTP");
      return;
    }

    // Validate phone number
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = phone.replace(/\s|-/g, "");
    if (!phoneRegex.test(cleanPhone)) {
      Alert.alert("Invalid Phone", "Please enter a valid 10-digit phone number starting with 6-9");
      return;
    }

    // Validate OTP
    if (otp.length !== 4 || !/^\d{4}$/.test(otp)) {
      Alert.alert("Invalid OTP", "OTP must be 4 digits");
      return;
    }

    try {
      const result = await login({
        phone: cleanPhone,
        otp,
      }).unwrap();

      // Store credentials first
      dispatch(
        setCredentials({
          user: {
            id: result.delivery_partner.id,
            email: `delivery_${result.delivery_partner.phone}@banda.com`,
            name: result.delivery_partner.name,
            phone: result.delivery_partner.phone,
            role: "delivery_partner",
            is_active: result.delivery_partner.is_active,
            created_at: new Date().toISOString(),
          },
          tokens: {
            access_token: result.access_token,
            refresh_token: result.refresh_token,
          },
        })
      );

      // Ensure tokens are stored before navigation
      // Wait a bit longer to ensure AsyncStorage operations complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Navigate after tokens are stored
      try {
        (navigation as any).replace("DeliveryPartnerTabs");
      } catch (navError) {
        console.error("Navigation error:", navError);
        // Fallback: try navigate instead of replace
        (navigation as any).navigate("DeliveryPartnerTabs");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage = error?.data?.detail || error?.message || "Please check your credentials and try again.";
      Alert.alert("Login Failed", errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="car-outline" size={48} color="#7B2D8E" />
            </View>
            <Text style={styles.title}>Delivery Partner Login</Text>
            <Text style={styles.subtitle}>Enter your phone number and OTP to continue</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Phone Number */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="9876543210"
                  placeholderTextColor="#9CA3AF"
                  value={phone}
                  onChangeText={(text) => {
                    const digits = text.replace(/\D/g, "");
                    if (digits.length <= 10) {
                      setPhone(digits);
                    }
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoCapitalize="none"
                />
              </View>
              <Text style={styles.hint}>10-digit phone number (starting with 6-9)</Text>
            </View>

            {/* OTP */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>OTP</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="1234"
                  placeholderTextColor="#9CA3AF"
                  value={otp}
                  onChangeText={(text) => {
                    const digits = text.replace(/\D/g, "");
                    if (digits.length <= 4) {
                      setOtp(digits);
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={4}
                  autoCapitalize="none"
                  secureTextEntry={false}
                />
              </View>
              <Text style={styles.hint}>
                Use OTP: <Text style={styles.otpHint}>1234</Text> for testing
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <Spinner size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="car-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Login</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Note:</Text> For testing, use OTP{" "}
              <Text style={styles.infoCode}>1234</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#7B2D8E15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: "#111827",
  },
  otpInput: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 8,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  hint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  otpHint: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "700",
    color: "#7B2D8E",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7B2D8E",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    borderWidth: 1,
    borderColor: "#93C5FD",
    borderRadius: 12,
    padding: 12,
    marginTop: 24,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#1E40AF",
  },
  infoBold: {
    fontWeight: "700",
  },
  infoCode: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontWeight: "700",
    backgroundColor: "#BFDBFE",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
});

