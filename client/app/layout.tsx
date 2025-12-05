// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Trivixa Media Gallery",
  description: "All Type of Media Gallery, Upload and Share",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-gray-50 font-sans antialiased flex flex-col"
      >
        <Navbar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 w-full">
            {children}
          </div>
        </main>
        <Footer />
      </body>
    </html>
  );
}
