"use client";

import Link from "next/link";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

/**
 * Empty State Props
 */
interface EmptyStateProps {
  icon?: React.ReactNode;
  emoji?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

/**
 * Empty State Component
 */
export function EmptyState({
  icon,
  emoji,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("text-center py-12 px-4", className)}>
      {emoji ? (
        <div className="text-6xl mb-4">{emoji}</div>
      ) : icon ? (
        <div className="flex justify-center mb-4">{icon}</div>
      ) : null}

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

      {description && (
        <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
          {description}
        </p>
      )}

      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button>{action.label}</Button>
          </Link>
        ) : (
          <Button onClick={action.onClick}>{action.label}</Button>
        )
      )}
    </div>
  );
}

