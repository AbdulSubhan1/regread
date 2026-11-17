import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RegRead — read a car registration card",
  description: "Upload a vehicle registration card and get clean, checked car details.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
