"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Smartphone } from "lucide-react";
import toast from "react-hot-toast";

import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";
import { useSendOTPMutation, useVerifyOTPMutation } from "@/store/api/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { ROUTES } from "@/lib/constants";

const mobileSchema = z.object({
  mobile_number: z.string().regex(/^[6-9]\d{9}$/, "Enter valid 10-digit mobile number"),
});

type MobileFormData = z.infer<typeof mobileSchema>;

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [displayOTP, setDisplayOTP] = useState<string | null>(null);

  const [sendOTP, { isLoading: isSendingOTP }] = useSendOTPMutation();
  const [verifyOTP, { isLoading: isVerifyingOTP }] = useVerifyOTPMutation();

  const mobileForm = useForm<MobileFormData>({
    resolver: zodResolver(mobileSchema),
    defaultValues: { mobile_number: "" },
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendOTP = async (data: MobileFormData) => {
    try {
      const result = await sendOTP({ mobile_number: data.mobile_number }).unwrap();
      setMobileNumber(data.mobile_number);
      setStep("otp");
      setOtpExpiresIn(result.expires_in);
      setDisplayOTP(result.otp_code);

      // countdown
      let timeLeft = result.expires_in;
      const timer = setInterval(() => {
        timeLeft -= 1;
        setOtpExpiresIn(timeLeft);
        if (timeLeft <= 0) clearInterval(timer);
      }, 1000);

      toast.success(`OTP sent to ${result.mobile_number}`);
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to send OTP");
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter 6-digit OTP");
      return;
    }

    try {
      const result = await verifyOTP({ mobile_number: mobileNumber, otp }).unwrap();
      dispatch(
        setCredentials({
          user: result.user,
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        })
      );
      toast.success("Welcome to Banda Bazaar!");
      router.push(ROUTES.HOME);
    } catch (error: any) {
      toast.error(error?.data?.detail || "Invalid OTP");
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-md mx-auto pt-10">
        <Card className="w-full animate-fade-in">
          <CardHeader className="text-center">
            {step === "otp" ? (
              <button
                onClick={() => {
                  setStep("mobile");
                  setOtp("");
                  setDisplayOTP(null);
                }}
                className="absolute left-4 top-4 p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
            ) : null}

            <CardTitle className="text-2xl font-bold">Login</CardTitle>
            <CardDescription>
              {step === "mobile"
                ? "Enter your mobile number to get OTP"
                : `OTP sent to ${mobileNumber.slice(0, 2)}****${mobileNumber.slice(-2)}`}
            </CardDescription>
          </CardHeader>

          {step === "mobile" ? (
            <CardContent className="space-y-4">
              <form onSubmit={mobileForm.handleSubmit(handleSendOTP)} className="space-y-4">
                <Input
                  label="Mobile Number"
                  type="tel"
                  placeholder="9876543210"
                  leftIcon={<Smartphone className="h-4 w-4" />}
                  error={mobileForm.formState.errors.mobile_number?.message}
                  maxLength={10}
                  {...mobileForm.register("mobile_number")}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                    mobileForm.setValue("mobile_number", value);
                  }}
                />

                <Button type="submit" fullWidth size="lg" isLoading={isSendingOTP}>
                  Send OTP
                </Button>
              </form>

              <div className="pt-2">
                <Link
                  href="/login/staff"
                  className="block text-center text-sm text-gray-600 hover:text-green-600 transition-colors"
                >
                  Not a customer? Vendor/Admin/Delivery Partner login →
                </Link>
              </div>
            </CardContent>
          ) : (
            <CardContent className="space-y-4">
              {displayOTP ? (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-green-700 font-medium mb-1">OTP (Testing)</p>
                  <p className="text-3xl font-bold text-green-600 tracking-widest font-mono">{displayOTP}</p>
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter 6-digit OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  autoFocus
                />
                {otpExpiresIn > 0 ? (
                  <p className="mt-2 text-xs text-gray-500 text-center">OTP expires in {formatTime(otpExpiresIn)}</p>
                ) : null}
              </div>

              <Button onClick={handleVerifyOTP} fullWidth size="lg" isLoading={isVerifyingOTP} disabled={otp.length !== 6}>
                Verify OTP
              </Button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const result = await sendOTP({ mobile_number: mobileNumber }).unwrap();
                    setOtp("");
                    setDisplayOTP(result.otp_code);
                    setOtpExpiresIn(result.expires_in);
                    toast.success(`OTP resent to ${result.mobile_number}`);
                  } catch (error: any) {
                    toast.error(error?.data?.detail || "Failed to resend OTP");
                  }
                }}
                className="w-full text-sm text-green-600 hover:text-green-700 transition-colors"
                disabled={otpExpiresIn > 240 || isSendingOTP}
              >
                Resend OTP {otpExpiresIn > 240 ? `(in ${formatTime(otpExpiresIn - 240)})` : ""}
              </button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

