import type { Metadata } from "next";
import "./globals.css";
import "./drvo-light.css";

export const metadata: Metadata = {
  title: "DRVO ERP — Platform Foundation",
  description: "DRVO ERP modular business platform · non-production foundation",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
