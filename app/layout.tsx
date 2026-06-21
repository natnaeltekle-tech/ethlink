import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { FloatingChat } from "@/components/floating-chat";
import { Toaster } from "@/components/ui/sonner";
import { MobileNav } from "@/components/mobile-nav";
import { GlobalBanner } from "@/components/global-banner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { AuthGate } from "@/components/auth/auth-gate";
import { AppInitializer } from "@/components/app-initializer";
import { PresenceTracker } from "@/components/presence-tracker";
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { CapacitorBackButton } from "@/components/capacitor-back-button";
import { OfflineBanner } from "@/components/offline-banner";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Eth-Links",
  description: "Premium service booking platform for Ethiopia",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Eth-Links",
  },
};

export const viewport: Viewport = {
  themeColor: "#F5C518",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Disables zoom for App feel
};

// Prevent Next.js from caching server fetches — avoids stale HTML on PWA resume
export const fetchCache = 'force-no-store';

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
    <html lang="en" suppressHydrationWarning className="dark" style={{ backgroundColor: '#0B0C15' }}>
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className={`${geistSans.className} bg-background text-foreground antialiased pb-16 md:pb-0 overflow-x-hidden`} style={{ backgroundColor: '#0B0C15', minHeight: '100vh' }}>
        <ClientErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <CapacitorBackButton />
            <AppInitializer>
              <AuthGate>
                <PresenceTracker />
                <ErrorBoundary name="Global Banner">
                  <GlobalBanner />
                </ErrorBoundary>
                <OfflineBanner />
                <div className="flex flex-col min-h-screen">
                  {children}
                </div>
                <ErrorBoundary name="Mobile Navigation">
                  <Suspense fallback={null}>
                    <MobileNav />
                  </Suspense>
                </ErrorBoundary>

                <ErrorBoundary name="AI Chat">
                  <FloatingChat />
                </ErrorBoundary>
                <Toaster />
              </AuthGate>
            </AppInitializer>
          </ThemeProvider>
        </ClientErrorBoundary>
      </body>
    </html>
  );
}
