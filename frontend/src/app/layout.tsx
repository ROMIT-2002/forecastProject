import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForecastIQ AI - Paid Ads Decision Engine",
  description: "AI-driven forecasting and budget optimization decision engine for media buyers and executives.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#f5f5f7] text-[#1d1d1f] min-h-screen">
        {children}
      </body>
    </html>
  );
}
