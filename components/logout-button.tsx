"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { safeSignOut } from "@/lib/actions";
import { useLogoutDebug } from "@/lib/hooks/useLogoutDebug";
import { LogoutOverlay } from "@/components/logout-overlay";

export function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { startTrace } = useLogoutDebug();

  const logout = async () => {
    if (isLoggingOut) return; // prevent double-clicks
    setIsLoggingOut(true);

    // Start debug trace — logs auth state every 100ms for 2s.
    // Persisted to sessionStorage["eth-links-logout-debug"] across page loads.
    startTrace();

    try {
      // 1. Clear client-side Supabase session
      const supabase = createClient();
      await supabase.auth.signOut();
      console.info("[LogoutButton] Client-side signOut complete");

      // 2. Clear server-side session & revalidate cache
      const result = await safeSignOut();
      if (!result.success) {
        console.warn("[LogoutButton] safeSignOut returned error:", result.error);
      } else {
        console.info("[LogoutButton] Server-side signOut complete");
      }
    } catch (err) {
      // Log but NEVER block — the redirect MUST happen regardless
      console.warn("[LogoutButton] Exception during sign out:", err);
    } finally {
      // GUARANTEED hard redirect — forces a full page reload to /auth/login.
      // Using window.location.href instead of router.push() prevents the WSoD
      // caused by Next.js trying to re-render a protected route with user=null.
      console.info("[LogoutButton] Redirecting to /auth/login");
      window.location.href = "/auth/login";
    }
  };

  return (
    <>
      {/* Full-screen overlay during logout — prevents WSoD / empty body */}
      {isLoggingOut && <LogoutOverlay />}

      <Button
        onClick={logout}
        disabled={isLoggingOut}
        variant="destructive"
        className="gap-2"
      >
        {isLoggingOut ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Logging out…
          </>
        ) : (
          <>
            <LogOut className="h-4 w-4" />
            Logout
          </>
        )}
      </Button>
    </>
  );
}
