import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { FloatingChat } from "@/components/floating-chat";
import { Toaster } from "@/components/ui/sonner";
import { MobileNav } from "@/components/mobile-nav";
import { GlobalBanner } from "@/components/global-banner";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Eth-Links",
  description: "Premium service booking platform for Ethiopia",
  manifest: "/manifest.json",
  themeColor: "#F5C518",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Eth-Links",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased pb-16 md:pb-0`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <GlobalBanner />
          <div className="page-container">
            {children}
          </div>
          <Suspense fallback={null}>
            <MobileNav />
          </Suspense>
          <FloatingChat />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}


// Vercel build fix

// Fixing Vercel build error - Attempt 2