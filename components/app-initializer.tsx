"use client";

import { useEffect, useState, useCallback } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import { Capacitor } from "@capacitor/core";

interface AppInitializerProps {
  children: React.ReactNode;
}

interface AppReadyState {
  isReady: boolean;
  error: Error | null;
}

/**
 * AppInitializer handles the splash screen lifecycle and app initialization.
 * It ensures the splash screen remains visible until the app is fully ready,
 * preventing the "White Screen of Death" issue.
 */
export function AppInitializer({ children }: AppInitializerProps) {
  const [state, setState] = useState<AppReadyState>({
    isReady: false,
    error: null,
  });

  // Hide splash screen with fade animation
  const hideSplashScreen = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const platform = Capacitor.getPlatform();
        if (platform === 'android') {
          // Artificial delay for Android to avoid race condition rendering blank
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
        
        console.log("🚀 SPLASH HIDDEN");
        await SplashScreen.hide({
          fadeOutDuration: 300, // Smooth fade transition
        });
      }
    } catch (error) {
      // Splash screen might already be hidden or not available
      console.log("Splash screen hide:", error);
    }
  }, []);

  // Initialize app and hide splash when ready
  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        // Minimum display time for splash screen to prevent flash
        const minSplashTime = new Promise((resolve) =>
          setTimeout(resolve, 500)
        );

        // Wait for minimum splash time
        await minSplashTime;

        if (mounted) {
          setState({ isReady: true, error: null });
        }
      } catch (error) {
        console.error("App initialization error:", error);
        if (mounted) {
          setState({ isReady: true, error: error as Error });
        }
      }
    };

    initializeApp();

    return () => {
      mounted = false;
    };
  }, []);

  // Hide splash screen when app is ready
  useEffect(() => {
    if (state.isReady) {
      hideSplashScreen();
    }
  }, [state.isReady, hideSplashScreen]);

  // Show loading state with dark background to prevent white flash
  if (!state.isReady) {
    return null; // Return null so the native splash stays visible
  }

  // Show error state if initialization failed
  if (state.error) {
    return <AppErrorScreen error={state.error} onRetry={() => setState({ isReady: false, error: null })} />;
  }

  return <>{children}</>;
}

/**
 * Loading screen shown while app initializes.
 * Matches the splash screen background to prevent flash.
 */
function AppLoadingScreen() {
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center"
      style={{ backgroundColor: "#0B0C15" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="bg-primary/10 p-4 rounded-full animate-pulse">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M11 17a1 1 0 0 1 2 0" />
            <path d="M7 7a1 1 0 1 0 2 0" />
            <path d="M15 7a1 1 0 1 0 2 0" />
            <path d="M7 12a1 1 0 1 0 2 0" />
            <path d="M15 12a1 1 0 1 0 2 0" />
            <path d="M12 3c-1.5 0-2.5 1-3 2.5-.5 1.5-1 2.5-2.5 3.5-1.5 1-2.5 2-2.5 3.5 0 3 4 6 8 6s8-3 8-6c0-1.5-1-2.5-2.5-3.5-1.5-1-2-2-2.5-3.5-.5-1.5-1.5-2.5-3-2.5" />
          </svg>
        </div>
        <span className="text-muted-foreground text-sm animate-pulse">
          Loading...
        </span>
      </div>
    </div>
  );
}

/**
 * Error screen shown when initialization fails.
 * Provides a retry button to attempt reinitialization.
 */
function AppErrorScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ backgroundColor: "#0B0C15" }}
    >
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="bg-destructive/10 p-4 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-destructive"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground">
            {error.message || "Failed to initialize the app. Please try again."}
          </p>
        </div>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export default AppInitializer;
