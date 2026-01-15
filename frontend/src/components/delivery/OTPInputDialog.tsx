"use client";

import { useState, useRef, useEffect } from "react";
import { X, AlertCircle, KeyRound } from "lucide-react";
import { Button, Card } from "@/components/ui";

interface OTPInputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (otp: string) => void;
  isLoading?: boolean;
  error?: string;
}

export function OTPInputDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  error,
}: OTPInputDialogProps) {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Focus first input when dialog opens
      inputRefs.current[0]?.focus();
      // Reset OTP when dialog opens
      setOtp(["", "", "", "", "", ""]);
    }
  }, [isOpen]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, "").slice(0, 6).split("");
        const newOtp = [...otp];
        digits.forEach((digit, i) => {
          if (i < 6) {
            newOtp[i] = digit;
          }
        });
        setOtp(newOtp);
        // Focus last filled input or first empty
        const lastFilledIndex = digits.length - 1;
        const nextIndex = lastFilledIndex < 5 ? lastFilledIndex + 1 : 5;
        inputRefs.current[nextIndex]?.focus();
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    const digits = text.replace(/\D/g, "").slice(0, 6).split("");
    const newOtp = [...otp];
    digits.forEach((digit, i) => {
      if (i < 6) {
        newOtp[i] = digit;
      }
    });
    setOtp(newOtp);
    // Focus last filled input or first empty
    const lastFilledIndex = digits.length - 1;
    const nextIndex = lastFilledIndex < 5 ? lastFilledIndex + 1 : 5;
    inputRefs.current[nextIndex]?.focus();
  };

  const handleConfirm = () => {
    const otpString = otp.join("");
    if (otpString.length === 6) {
      onConfirm(otpString);
    }
  };

  if (!isOpen) return null;

  const otpString = otp.join("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900">Enter Delivery OTP</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  OTP Verification Required
                </p>
                <p className="text-sm text-blue-700">
                  Please ask the customer for the 6-digit OTP to confirm delivery. The OTP was sent
                  to the customer when the order was placed.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Enter 6-Digit OTP
            </label>
            <div className="flex gap-2 justify-center">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  disabled={isLoading}
                />
              ))}
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-2 text-center">{error}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={isLoading || otpString.length !== 6}
              className="flex-1"
            >
              {isLoading ? "Verifying..." : "Verify & Deliver"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}


