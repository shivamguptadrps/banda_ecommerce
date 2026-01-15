"use client";

import { Bell, Search } from "lucide-react";
import { Avatar } from "@/components/ui";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/store/slices/authSlice";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

/**
 * Dashboard Header Component
 */
export function DashboardHeader({ title, subtitle, action }: DashboardHeaderProps) {
  const user = useAppSelector(selectUser);

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="pl-12 lg:pl-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 hidden sm:block">{subtitle}</p>
          )}
        </div>

        {/* Action Button (if provided) */}
        {action && (
          <div className="mr-4">
            {action}
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Search (Desktop) */}
          <div className="hidden md:block relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-64 rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-secondary" />
          </button>

          {/* User Avatar (Desktop) */}
          <div className="hidden sm:flex items-center gap-2">
            <Avatar name={user?.name} size="sm" />
            <span className="text-sm font-medium text-gray-700">
              {user?.name?.split(" ")[0]}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

