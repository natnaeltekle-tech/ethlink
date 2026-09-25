"use client";

import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

interface AppInitializerProps {
  children: React.ReactNode;
}

/**
 * Keeps splash from blocking the UI forever.
 * Never imports @capacitor/splash-screen at module top-level so a plugin
 * failure cannot black-screen the entire app bundle.
 */
export function AppInitializer({ children }: AppInitializerProps) {
  const [isReady, setIsReady] = useState(false);

  const hideSplashScreen = useCallback(async () => {
    try {
      if (!Capacitor.isNativePlatform()) return;
      // Dynamic import — if the plugin is missing, app still continues
      const { SplashScreen } = await import("@capacitor/splash-screen");
      await SplashScreen.hide({ fadeOutDuration: 200 });
    } catch (error) {
      console.log("[AppInitializer] Splash hide skipped:", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Ready almost immediately so children paint; splash hide is best-effort
    const readyTimer = setTimeout(() => {
      if (mounted) setIsReady(true);
    }, 150);

    // Absolute safety net
    const forceTimer = setTimeout(() => {
      if (mounted) setIsReady(true);
      hideSplashScreen();
    }, 2000);

    return () => {
      mounted = false;
      clearTimeout(readyTimer);
      clearTimeout(forceTimer);
    };
  }, [hideSplashScreen]);

  useEffect(() => {
    if (isReady) hideSplashScreen();
  }, [isReady, hideSplashScreen]);

  if (!isReady) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-[9998]"
        style={{ backgroundColor: "#0B0C15" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-2 border-[#f5c619] border-t-transparent animate-spin" />
          <span className="text-[#f5c619] text-sm font-semibold">Eth-Links</span>
          <span className="text-white/50 text-xs">Starting…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AppInitializer;
