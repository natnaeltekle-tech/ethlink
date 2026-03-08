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
import { ClientErrorBoundary } from "@/components/ClientErrorBoundary";
import { CapacitorBackButton } from "@/components/capacitor-back-button";
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
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${geistSans.className} bg-background text-foreground antialiased pb-16 md:pb-0 overflow-x-hidden`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <CapacitorBackButton />
          <ClientErrorBoundary>
            <AppInitializer>
              <AuthGate>
                <ErrorBoundary name="Global Banner">
                  <GlobalBanner />
                </ErrorBoundary>
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
          </ClientErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}