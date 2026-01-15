"use client";

import { cn } from "@/lib/utils";

/**
 * Badge Props
 */
interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Variant classes
 */
const variantClasses = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  info: "bg-primary/10 text-primary",
  outline: "bg-transparent border border-gray-200 text-gray-700",
};

/**
 * Size classes
 */
const sizeClasses = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
  lg: "text-sm px-3 py-1",
};

/**
 * Badge Component
 */
export function Badge({
  children,
  variant = "default",
  size = "md",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
}

