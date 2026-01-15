"use client";

import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Select Option Interface
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Select Props
 */
interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  selectSize?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

/**
 * Size classes
 */
const sizeClasses = {
  sm: "py-1.5 px-3 text-sm",
  md: "py-2.5 px-4 text-sm",
  lg: "py-3 px-4 text-base",
};

/**
 * Select Component
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      options,
      placeholder,
      selectSize = "md",
      fullWidth = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn("relative", fullWidth && "w-full")}>
        {label && (
          <label className="form-label">{label}</label>
        )}

        <div className="relative">
          <select
            ref={ref}
            disabled={disabled}
            className={cn(
              "appearance-none rounded-lg border bg-white pr-10 transition-colors focus:outline-none focus:ring-1",
              sizeClasses[selectSize],
              error
                ? "border-error focus:border-error focus:ring-error"
                : "border-gray-200 focus:border-primary focus:ring-primary",
              disabled && "bg-gray-100 cursor-not-allowed opacity-60",
              fullWidth && "w-full",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        {error && <p className="form-error">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

