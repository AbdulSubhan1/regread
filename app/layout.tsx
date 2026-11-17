import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import Script from "next/script";
import { PULSE_URL } from "@/constants/config";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "RegRead — read a car registration card",
  description:
    "Upload a vehicle registration card and get clean, checked car details. UAE, Pakistan, Saudi Arabia, Qatar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased">
        {children}
        {/* Pulse: cookie-free page views, named events, browser errors and Core Web Vitals */}
        <Script src={`${PULSE_URL}/beacon.js`} data-project="regread" strategy="afterInteractive" />
      </body>
    </html>
  );
}
