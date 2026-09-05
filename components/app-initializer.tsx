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
 * Handles splash lifecycle. Never leaves the user on a permanent black screen.
 */
export function AppInitializer({ children }: AppInitializerProps) {
  const [state, setState] = useState<AppReadyState>({
    isReady: false,
    error: null,
  });

  const hideSplashScreen = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await SplashScreen.hide({ fadeOutDuration: 300 });
      }
    } catch (error) {
      console.log("Splash screen hide:", error);
    }
  }, []);

  // Always force-hide splash within 3s even if other init paths hang
  useEffect(() => {
    const forceHide = setTimeout(() => {
      hideSplashScreen();
      setState((prev) => (prev.isReady ? prev : { isReady: true, error: null }));
    }, 3000);

    return () => clearTimeout(forceHide);
  }, [hideSplashScreen]);

  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
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

  useEffect(() => {
    if (state.isReady) {
      hideSplashScreen();
    }
  }, [state.isReady, hideSplashScreen]);

  if (!state.isReady) {
    return <AppLoadingScreen />;
  }

  if (state.error) {
    return (
      <AppErrorScreen
        error={state.error}
        onRetry={() => {
          setState({ isReady: false, error: null });
          window.location.reload();
        }}
      />
    );
  }

  return <>{children}</>;
}

function AppLoadingScreen() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ backgroundColor: "#0B0C15" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-2 border-[#f5c619] border-t-transparent animate-spin" />
        <span className="text-white/60 text-sm">Loading Eth-Links…</span>
      </div>
    </div>
  );
}

function AppErrorScreen({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ backgroundColor: "#0B0C15" }}
    >
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
        <p className="text-sm text-white/60">
          {error.message || "Failed to initialize the app. Please try again."}
        </p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-[#f5c619] text-black rounded-lg font-medium"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export default AppInitializer;
