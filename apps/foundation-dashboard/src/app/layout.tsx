import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/store/Providers";
import { ENVIRONMENT_BANNER } from "@/config/env";
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SwarpPay",
  description: "SwarpPay wallet and SwarpLaunch launchpad.",
  authors: [{ name: "Swarp Foundation" }],
  creator: "Swarp Foundation",
  publisher: "Swarp Foundation",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`} style={{ fontFamily: 'var(--font-inter)' }}>
        {ENVIRONMENT_BANNER && (
          <div
            role="status"
            className="pointer-events-none fixed left-1/2 top-1.5 z-[1000] -translate-x-1/2 rounded-full bg-amber-400/90 px-3 py-0.5 text-[11px] font-semibold text-black shadow"
          >
            {ENVIRONMENT_BANNER}
          </div>
        )}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
