import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/components/auth/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Waypoint Pulse",
    template: "%s | Waypoint Pulse",
  },
  description:
    "Waypoint Pulse is an intelligent logistics control platform for delivery planning, loading, driver operations, live execution, and store receipt confirmation.",
  applicationName: "Waypoint Pulse",
  keywords: [
    "Waypoint Pulse",
    "logistics",
    "delivery planning",
    "fleet management",
    "route planning",
    "dispatcher",
    "driver",
    "loader",
    "store manager",
  ],
  authors: [
    {
      name: "JKoDe",
    },
  ],
  creator: "JKoDe",
  publisher: "JKoDe",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="
          min-h-full
          bg-[#f5f5f3]
          font-sans
          text-neutral-950
          selection:bg-neutral-950
          selection:text-white
        "
      >
        <AuthProvider>
          <div className="min-h-screen">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}