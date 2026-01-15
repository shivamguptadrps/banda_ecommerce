import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Banda - Quick Commerce for Your City",
  description:
    "Order groceries, fresh produce, and daily essentials from local vendors. Fast delivery to your doorstep.",
  keywords: ["ecommerce", "grocery", "quick commerce", "local vendors", "delivery"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

