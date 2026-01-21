import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useLoginMutation } from "@/store/api/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type StaffRole = "vendor" | "admin" | null;

export default function StaffLoginScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const [role, setRole] = useState<StaffRole>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [login, { isLoading }] = useLoginMutation();

  const handleLogin = async () => {
    if (!role) {
      Alert.alert("Select Role", "Please select Vendor or Admin");
      return;
    }
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter email and password");
      return;
    }

    try {
      const result = await login({ email, password }).unwrap();

      // Hard guard: ensure role matches
      if (role === "vendor" && result.user.role !== "vendor") {
        Alert.alert("Not Vendor", "This account is not a vendor account.");
        return;
      }
      if (role === "admin" && result.user.role !== "admin") {
        Alert.alert("Not Admin", "This account is not an admin account.");
        return;
      }

      dispatch(
        setCredentials({
          user: result.user,
          tokens: {
            access_token: result.access_token,
            refresh_token: result.refresh_token,
          },
        })
      );

      Alert.alert("Success", "Welcome back!");
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Login Failed", e?.data?.detail || "Login failed");
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.title}>Staff Login</Text>
            <Text style={styles.subtitle}>Vendor / Admin / Delivery Partner</Text>
          </View>

          <View style={styles.content}>
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Select Role</Text>

              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[styles.rolePill, role === "vendor" && styles.rolePillActive]}
                  onPress={() => setRole("vendor")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="storefront" size={16} color={role === "vendor" ? "#FFFFFF" : "#10B981"} />
                  <Text style={[styles.rolePillText, role === "vendor" && styles.rolePillTextActive]}>Vendor</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.rolePill, role === "admin" && styles.rolePillActive]}
                  onPress={() => setRole("admin")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="shield-checkmark" size={16} color={role === "admin" ? "#FFFFFF" : "#10B981"} />
                  <Text style={[styles.rolePillText, role === "admin" && styles.rolePillTextActive]}>Admin</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>Email & Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color="#6B7280" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
              </View>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  style={styles.input}
                />
              </View>

              <Button onPress={handleLogin} isLoading={isLoading} style={styles.loginBtn}>
                Login
              </Button>

              <View style={styles.divider} />

              <TouchableOpacity
                onPress={() => navigation.navigate("DeliveryPartnerLogin")}
                style={styles.deliveryLink}
                activeOpacity={0.85}
              >
                <View style={styles.deliveryIcon}>
                  <Ionicons name="car" size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deliveryTitle}>Delivery Partner Login</Text>
                  <Text style={styles.deliverySub}>Use Delivery Partner OTP login</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 20 },
  header: { marginBottom: 14, alignItems: "center" },
  backButton: { position: "absolute", left: 0, top: 0, padding: 8 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 4, textAlign: "center" },
  content: { width: "100%", maxWidth: 420, alignSelf: "center" },
  card: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#111827", marginTop: 4, marginBottom: 10 },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  rolePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    backgroundColor: "#FFFFFF",
  },
  rolePillActive: { backgroundColor: "#10B981", borderColor: "#10B981" },
  rolePillText: { fontSize: 13, fontWeight: "700", color: "#10B981" },
  rolePillTextActive: { color: "#FFFFFF" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 10,
  },
  input: { flex: 1, fontSize: 15, color: "#111827" },
  loginBtn: { marginTop: 8 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 14 },
  deliveryLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  deliveryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D1FAE5",
  },
  deliveryTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  deliverySub: { fontSize: 12, color: "#6B7280", marginTop: 1 },
});

