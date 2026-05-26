"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Handshake, AlertCircle, RefreshCw, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppInitializer } from "@/components/app-initializer";

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

function ErrorView({ error, onRetry, onContinueOffline }: { error: string, onRetry: () => void, onContinueOffline?: () => void }) {
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
          <h2 className="text-xl font-semibold text-foreground">Authentication Error</h2>
          <p className="text-muted-foreground text-sm pb-4">
            {error || "Failed to connect to our authentication services. Please check your connection."}
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
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;
  const appInitializer = useAppInitializer();

  const initializeAuth = useCallback(async (mounted: { current: boolean }, isRetry = false) => {
    const currentRetry = retryCountRef.current;
    
    try {
      if (!isRetry) {
        setError(null);
      }
      console.log(`[AuthGate] Initializing auth (attempt ${currentRetry + 1}/${MAX_RETRIES + 1})...`);
      
      const supabase = createClient();
      
      // Get initial session with 20 second timeout
      let sessionResult: { data: { session: any }; error: any } | null = null;
      
      try {
        // Use AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log("[AuthGate] 20s timeout reached, aborting");
          controller.abort();
        }, 20000);
        
        sessionResult = await supabase.auth.getSession();
        clearTimeout(timeoutId);
        
        // If there's an error in the result but no network error, log it
        if (sessionResult?.error) {
          console.warn("[AuthGate] Session result contains error:", sessionResult.error.message);
        }
      } catch (fetchError: any) {
        // Network error (Failed to fetch, CORS, etc.)
        console.error("[AuthGate] Auth getSession failed:", fetchError);
        console.error("[AuthGate] Full error object:", JSON.stringify(fetchError, Object.getOwnPropertyNames(fetchError)));
        
        if (fetchError.name === 'AbortError') {
          console.log("[AuthGate] Auth request timed out after 20s");
        }
        
        // Return null session instead of throwing - will trigger retry or offline mode
        sessionResult = { data: { session: null }, error: null };
      }

      if (!mounted.current) return;

      // Check if we got a valid response (even if no session)
      if (!sessionResult) {
        console.error("[AuthGate] No session result - unexpected error");
        setError("Authentication service unavailable");
        return;
      }

      console.log("[AuthGate] Auth check completed, session:", sessionResult.data?.session ? "exists" : "none");
      
      setIsReady(true);
      setIsOfflineMode(!sessionResult?.data?.session);
      setIsRetrying(false);
    } catch (err: any) {
      console.error("[AuthGate] Auth error:", err);
      console.error("[AuthGate] Full error:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
      
      if (!mounted.current) return;

      // Check if we should retry
      if (retryCountRef.current < MAX_RETRIES && !isRetry) {
        console.log(`[AuthGate] Retrying in ${RETRY_DELAY_MS}ms...`);
        setIsRetrying(true);
        retryCountRef.current += 1;
        
        setTimeout(() => {
          if (mounted.current) {
            initializeAuth({ current: true }, true);
          }
        }, RETRY_DELAY_MS);
        
        return;
      }

      let errorMsg = err.message || "Failed to initialize authentication.";
      
      // Improve wording for different error types
      if (errorMsg.includes("Failed to fetch") || errorMsg.includes("Network error")) {
        errorMsg = "Network error: Failed to reach the authentication server.";
      } else if (errorMsg.includes("timeout") || errorMsg.includes("timed out")) {
        errorMsg = "Auth request timed out. Please check your connection.";
      }
      
      setError(errorMsg);
      setIsRetrying(false);
    }
  }, [onReady]);

  const handleRetry = useCallback(() => {
    console.log("[AuthGate] Manual retry triggered");
    retryCountRef.current = 0; // Reset retry count on manual retry
    setIsRetrying(false);
    setError(null);
    setIsReady(false);
    initializeAuth({ current: true });
  }, [initializeAuth]);

  const handleContinueOffline = useCallback(() => {
    console.log("[AuthGate] Continuing in offline mode");
    setIsOfflineMode(true);
    setIsReady(true);
    setError(null);
  }, []);

  useEffect(() => {
    const mounted = { current: true };
    initializeAuth(mounted);

    return () => {
      mounted.current = false;
    };
  }, [initializeAuth]);

  useEffect(() => {
    if (isReady || error) {
      onReady?.();
      if (appInitializer) {
        appInitializer.setAuthReady(true);
      }
    }
  }, [isReady, error, onReady, appInitializer]);

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

  // Pass offline mode state to children via context in real app
  // For now, just render children
  return <>{children}</>;
}
