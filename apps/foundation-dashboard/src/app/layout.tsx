import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/store/Providers";
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Swarp Foundation Dashboard",
  description: "Swarp Foundation crypto dashboard. Token launches, wallet, portfolio, staking, rewards, and trading tools.",
  keywords: ["crypto", "payments", "crypto dashboard", "blockchain", "blockchain"],
  authors: [{ name: "Swarp Foundation" }],
  creator: "Swarp Foundation",
  publisher: "Swarp Foundation",
  robots: "index, follow",
  viewport: "width=device-width, initial-scale=1.0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`} style={{ fontFamily: 'var(--font-inter)' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
