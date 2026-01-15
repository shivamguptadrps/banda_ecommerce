"use client";

import { cn } from "@/lib/utils";

/**
 * Spinner Props
 */
interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "primary" | "secondary" | "white" | "gray";
  className?: string;
}

/**
 * Size classes
 */
const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-3",
  xl: "h-12 w-12 border-4",
};

/**
 * Color classes
 */
const colorClasses = {
  primary: "border-primary border-t-transparent",
  secondary: "border-secondary border-t-transparent",
  white: "border-white border-t-transparent",
  gray: "border-gray-300 border-t-gray-600",
};

/**
 * Spinner Component
 */
export function Spinner({
  size = "md",
  color = "primary",
  className,
}: SpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full",
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Full Page Spinner
 */
export function PageSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Inline Spinner with text
 */
export function LoadingText({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-500">
      <Spinner size="sm" color="gray" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

