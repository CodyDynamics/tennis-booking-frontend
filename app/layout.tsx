import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { AppLoadingProvider } from "@/components/layout/app-loading-provider";
import { ReactQueryProvider } from "@/lib/react-query-provider";

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
            {children}
          </AppLoadingProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
