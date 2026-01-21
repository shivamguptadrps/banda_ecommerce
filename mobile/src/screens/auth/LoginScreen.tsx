import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useSendOTPMutation, useVerifyOTPMutation } from "@/store/api/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [displayOTP, setDisplayOTP] = useState<string | null>(null);

  const [sendOTP, { isLoading: isSendingOTP }] = useSendOTPMutation();
  const [verifyOTP, { isLoading: isVerifyingOTP }] = useVerifyOTPMutation();

  useEffect(() => {
    if (otpExpiresIn <= 0) return;
    const timer = setTimeout(() => setOtpExpiresIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpExpiresIn]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendOTP = async () => {
    if (mobileNumber.length !== 10) {
      Alert.alert("Invalid Mobile", "Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      const result = await sendOTP({ mobile_number: mobileNumber }).unwrap();
      setStep("otp");
      setOtp("");
      setOtpExpiresIn(result.expires_in);
      setDisplayOTP(result.otp_code);
      Alert.alert("OTP Sent", `OTP sent to ${result.mobile_number}`);
    } catch (e: any) {
      Alert.alert("Error", e?.data?.detail || "Failed to send OTP");
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter 6-digit OTP");
      return;
    }

    try {
      const result = await verifyOTP({ mobile_number: mobileNumber, otp }).unwrap();
      dispatch(
        setCredentials({
          user: result.user,
          tokens: { access_token: result.access_token, refresh_token: result.refresh_token },
        })
      );
      Alert.alert("Success", "Welcome to Banda Bazaar!");
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Error", e?.data?.detail || "Invalid OTP");
    }
  };

  const handleResend = async () => {
    try {
      const result = await sendOTP({ mobile_number: mobileNumber }).unwrap();
      setOtp("");
      setOtpExpiresIn(result.expires_in);
      setDisplayOTP(result.otp_code);
      Alert.alert("OTP Resent", `OTP resent to ${result.mobile_number}`);
    } catch (e: any) {
      Alert.alert("Error", e?.data?.detail || "Failed to resend OTP");
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Logo width={180} height={50} />
            <Text style={styles.title}>Login</Text>
            <Text style={styles.subtitle}>
              {step === "mobile" ? "Enter your mobile number to get OTP" : "Enter the OTP sent to your mobile"}
            </Text>
          </View>

          <View style={styles.content}>
            <Card style={styles.card}>
              {step === "mobile" ? (
                <>
                  <View style={styles.inputWrap}>
                    <Ionicons name="phone-portrait-outline" size={18} color="#6B7280" />
                    <TextInput
                      value={mobileNumber}
                      onChangeText={(t) => setMobileNumber(t.replace(/\D/g, "").slice(0, 10))}
                      placeholder="9876543210"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                      maxLength={10}
                      style={styles.input}
                    />
                  </View>

                  <Button onPress={handleSendOTP} isLoading={isSendingOTP} style={styles.button}>
                    Send OTP
                  </Button>

                  <TouchableOpacity onPress={() => navigation.navigate("StaffLogin")} style={styles.staffLink} activeOpacity={0.85}>
                    <Text style={styles.staffLinkText}>Not a customer? Staff login →</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {displayOTP ? (
                    <View style={styles.otpDisplayContainer}>
                      <Text style={styles.otpDisplayLabel}>OTP (Testing)</Text>
                      <Text style={styles.otpDisplayCode}>{displayOTP}</Text>
                    </View>
                  ) : null}

                  <View style={styles.otpContainer}>
                    <TextInput
                      value={otp}
                      onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      maxLength={6}
                      style={styles.otpInput}
                      textAlign="center"
                      autoFocus
                    />
                    {otpExpiresIn > 0 ? <Text style={styles.timer}>OTP expires in {formatTime(otpExpiresIn)}</Text> : null}
                  </View>

                  <Button onPress={handleVerifyOTP} isLoading={isVerifyingOTP} disabled={otp.length !== 6} style={styles.button}>
                    Verify OTP
                  </Button>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      onPress={() => {
                        setStep("mobile");
                        setOtp("");
                        setDisplayOTP(null);
                        setOtpExpiresIn(0);
                      }}
                      style={styles.changeNumber}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="arrow-back" size={16} color="#10B981" />
                      <Text style={styles.changeNumberText}>Change number</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleResend}
                      disabled={otpExpiresIn > 240 || isSendingOTP}
                      style={styles.resend}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.resendText}>
                        Resend {otpExpiresIn > 240 ? `(in ${formatTime(otpExpiresIn - 240)})` : ""}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
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
  header: { alignItems: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827", marginTop: 10 },
  subtitle: { fontSize: 13, color: "#6B7280", textAlign: "center", marginTop: 4 },
  content: { width: "100%", maxWidth: 420, alignSelf: "center" },
  card: { padding: 16 },
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
  },
  input: { flex: 1, fontSize: 15, color: "#111827" },
  button: { marginTop: 12 },
  staffLink: { marginTop: 12, paddingVertical: 10 },
  staffLinkText: { textAlign: "center", fontSize: 13, color: "#6B7280", fontWeight: "600" },
  otpDisplayContainer: {
    backgroundColor: "#F0FDF4",
    borderWidth: 2,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  otpDisplayLabel: { fontSize: 12, fontWeight: "700", color: "#059669" },
  otpDisplayCode: { fontSize: 30, fontWeight: "900", color: "#10B981", letterSpacing: 8, marginTop: 6 },
  otpContainer: { marginTop: 4 },
  otpInput: {
    height: 56,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 8,
    color: "#111827",
  },
  timer: { marginTop: 8, fontSize: 12, color: "#6B7280", textAlign: "center" },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  changeNumber: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  changeNumberText: { color: "#10B981", fontWeight: "800", fontSize: 12 },
  resend: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  resendText: { color: "#6B7280", fontWeight: "700", fontSize: 12 },
});

