"use client";

import { useEffect, useState, useCallback } from "react";
import { Handshake } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SplashScreen } from "@capacitor/splash-screen";
import { Capacitor } from "@capacitor/core";

function Loading() {
  return (
    <div 
      className="h-screen w-full flex items-center justify-center"
      style={{ backgroundColor: "#0B0C15" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="bg-primary/10 p-4 rounded-full animate-pulse">
          <Handshake className="h-12 w-12 text-primary" />
        </div>
        <span className="text-muted-foreground text-sm animate-pulse">
          Loading...
        </span>
      </div>
    </div>
  );
}

interface AuthGateProps {
  children: React.ReactNode;
  onReady?: () => void;
}

export function AuthGate({ children, onReady }: AuthGateProps) {
  const [isReady, setIsReady] = useState(false);

  const hideSplashScreen = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await SplashScreen.hide({
          fadeOutDuration: 300,
        });
      }
    } catch (err) {
      // Splash screen might already be hidden or not available
      console.log("Splash screen hide:", err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        const supabase = createClient();
        
        // Get initial session with timeout to prevent hanging
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("Auth timeout")), 10000);
        });

        await Promise.race([sessionPromise, timeoutPromise]);

        if (mounted) {
          setIsReady(true);
          // Notify parent that auth is ready
          onReady?.();
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        if (mounted) {
          // Still set ready to true to prevent hanging on splash screen
          setIsReady(true);
          onReady?.();
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [onReady]);

  // Hide splash screen when ready
  useEffect(() => {
    if (isReady) {
      hideSplashScreen();
    }
  }, [isReady, hideSplashScreen]);

  if (!isReady) {
    return <Loading />;
  }

  // Even if there's an error, we show children to prevent hanging
  // The error can be handled by the app's error boundary
  return <>{children}</>;
}
