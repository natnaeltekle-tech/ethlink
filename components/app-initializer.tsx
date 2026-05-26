"use client";

import { useEffect, useState, useCallback, createContext, useContext } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import { Capacitor } from "@capacitor/core";

interface AppInitializerContextType {
  setAuthReady: (ready: boolean) => void;
}

export const AppInitializerContext = createContext<AppInitializerContextType | null>(null);

export function useAppInitializer() {
  return useContext(AppInitializerContext);
}

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
  const [isAuthReady, setIsAuthReady] = useState(false);

  const setAuthReady = useCallback((ready: boolean) => {
    setIsAuthReady(ready);
  }, []);

  // Hide splash screen with fade animation
  const hideSplashScreen = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const platform = Capacitor.getPlatform();
        if (platform === 'android') {
          // Allow extra time for Android WebView to paint first frame
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        
        console.log("🚀 SPLASH HIDDEN - smooth transition to UI");
        await SplashScreen.hide({
          fadeOutDuration: 500, // Premium smooth fade transition
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

  // Service Worker purge: if app fails to hydrate within 3s, nuke dead SWs and reload
  useEffect(() => {
    const swTimeout = setTimeout(async () => {
      if (!state.isReady && 'serviceWorker' in navigator) {
        console.warn('⚠️ PWA hydration stalled — purging service workers');
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(r => r.unregister()));
          // Clear all caches
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }
          window.location.reload();
        } catch (e) {
          console.error('SW purge failed:', e);
        }
      }
    }, 3000);

    return () => clearTimeout(swTimeout);
  }, [state.isReady]);

  // Hide splash screen when app and auth are ready
  useEffect(() => {
    if (state.isReady && isAuthReady) {
      hideSplashScreen();
    }
  }, [state.isReady, isAuthReady, hideSplashScreen]);

  // If there's an initialization error, make sure the splash screen is hidden
  // so the user can see the retry options.
  useEffect(() => {
    if (state.error) {
      hideSplashScreen();
    }
  }, [state.error, hideSplashScreen]);

  // Show error state if initialization failed
  if (state.error) {
    return <AppErrorScreen error={state.error} onRetry={() => setState({ isReady: false, error: null })} />;
  }

  return (
    <AppInitializerContext.Provider value={{ setAuthReady }}>
      {children}
    </AppInitializerContext.Provider>
  );
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
