import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "react-phone-number-input/style.css";
import { Navbar } from "@/components/layout/navbar";
import { MustChangePasswordGate } from "@/components/auth/must-change-password-gate";
import { AppLoadingProvider } from "@/components/layout/app-loading-provider";
import { ReactQueryProvider } from "@/lib/react-query-provider";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tennis Booking & Coaching System",
  description: "Modern tennis court booking and coaching progress management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ReactQueryProvider>
          <AppLoadingProvider>
            <Navbar />
            <MustChangePasswordGate />
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                className: "text-sm font-medium",
                duration: 4000,
              }}
            />
          </AppLoadingProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
