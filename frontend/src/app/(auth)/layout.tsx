import Link from "next/link";
import Image from "next/image";
import { APP_NAME } from "@/lib/constants";

/**
 * Auth Layout
 * Centered layout for login, register pages
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="inline-block">
          <Image
            src="/images/logo.svg"
            alt={APP_NAME}
            width={180}
            height={50}
            className="h-12 sm:h-14 w-auto object-contain"
            priority
          />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </footer>
    </div>
  );
}

