"use client";

import { useEffect, useState } from "react";

/**
 * Razorpay Script Loader
 * Dynamically loads Razorpay checkout script
 */
export function RazorpayScript() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Check if script is already loaded
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      setLoaded(true);
      return;
    }

    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      setLoaded(true);
    };
    script.onerror = () => {
      console.error("Failed to load Razorpay script");
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup: remove script if component unmounts
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        // Don't remove if other components might be using it
        // document.body.removeChild(existingScript);
      }
    };
  }, []);

  return null; // This component doesn't render anything
}

/**
 * Check if Razorpay is loaded
 */
export function isRazorpayLoaded(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).Razorpay;
}

/**
 * Get Razorpay instance
 */
export function getRazorpay(): any {
  if (typeof window === "undefined") return null;
  return (window as any).Razorpay;
}

