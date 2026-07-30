"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Handshake, AlertCircle, RefreshCw, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function Loading({ retrying = false }: { retrying?: boolean }) {
  return (
    <div
      className="h-screen w-full flex items-center justify-center bg-background"
      style={{ backgroundColor: "#0B0C15" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="bg-primary/10 p-4 rounded-full animate-pulse">
          <Handshake className="h-12 w-12 text-primary" />
        </div>
        <span className="text-muted-foreground text-sm animate-pulse">
          {retrying ? "Retrying..." : "Loading..."}
        </span>
      </div>
    </div>
  );
}

function ErrorView({
  error,
  onRetry,
  onContinueOffline,
}: {
  error: string;
  onRetry: () => void;
  onContinueOffline?: () => void;
}) {
  return (
    <div
      className="h-screen w-full flex items-center justify-center p-4 bg-background"
      style={{ backgroundColor: "#0B0C15" }}
    >
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="bg-destructive/10 p-4 rounded-full">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Authentication Error
          </h2>
          <p className="text-muted-foreground text-sm pb-4">
            {error ||
              "Failed to connect to our authentication services. Please check your connection."}
          </p>
        </div>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium border border-primary/20"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
        {onContinueOffline && (
          <button
            onClick={onContinueOffline}
            className="flex items-center gap-2 px-6 py-2.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium border border-border"
          >
            <WifiOff className="h-4 w-4" />
            Continue in Offline Mode
          </button>
        )}
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
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 2;
  const RETRY_DELAY_MS = 1500;

  const forceReady = useCallback(() => {
    setIsReady(true);
    setIsOfflineMode(true);
    setError(null);
    setIsRetrying(false);
    onReady?.();
  }, [onReady]);

  const initializeAuth = useCallback(
    async (mounted: { current: boolean }, isRetry = false) => {
      try {
        if (!isRetry) setError(null);

        const supabase = createClient();
        let sessionResult: { data: { session: any }; error: any } | null = null;

        try {
          const timeoutId = setTimeout(() => {
            console.log("[AuthGate] 8s timeout — forcing ready");
          }, 8000);

          sessionResult = await supabase.auth.getSession();
          clearTimeout(timeoutId);

          if (sessionResult?.error) {
            console.warn("[AuthGate] Session error:", sessionResult.error.message);
          }
        } catch (fetchError: any) {
          console.error("[AuthGate] getSession failed:", fetchError);
          sessionResult = { data: { session: null }, error: null };
        }

        if (!mounted.current) return;

        if (!sessionResult) {
          forceReady();
          return;
        }

        setIsReady(true);
        setIsOfflineMode(!sessionResult?.data?.session);
        setIsRetrying(false);
        onReady?.();
      } catch (err: any) {
        if (!mounted.current) return;

        if (retryCountRef.current < MAX_RETRIES) {
          setIsRetrying(true);
          retryCountRef.current += 1;
          setTimeout(() => {
            if (mounted.current) initializeAuth({ current: true }, true);
          }, RETRY_DELAY_MS);
          return;
        }

        // Final fallback — never leave the user on a blank screen
        forceReady();
      }
    },
    [onReady, forceReady]
  );

  const handleRetry = useCallback(() => {
    retryCountRef.current = 0;
    setIsRetrying(false);
    setError(null);
    setIsReady(false);
    initializeAuth({ current: true });
  }, [initializeAuth]);

  const handleContinueOffline = useCallback(() => {
    forceReady();
  }, [forceReady]);

  useEffect(() => {
    const mounted = { current: true };
    initializeAuth(mounted);

    // Absolute safety net — force ready after 4 seconds no matter what
    const safety = setTimeout(() => {
      if (mounted.current) forceReady();
    }, 4000);

    return () => {
      mounted.current = false;
      clearTimeout(safety);
    };
  }, [initializeAuth, forceReady]);

  if (error) {
    return (
      <ErrorView
        error={error}
        onRetry={handleRetry}
        onContinueOffline={handleContinueOffline}
      />
    );
  }

  if (!isReady && !isOfflineMode) {
    return <Loading retrying={isRetrying} />;
  }

  return <>{children}</>;
}
