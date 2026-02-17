"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { safeSignOut } from "@/lib/actions";

export function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    if (isLoggingOut) return; // prevent double-clicks
    setIsLoggingOut(true);

    try {
      // 1. Clear client-side Supabase session
      const supabase = createClient();
      await supabase.auth.signOut();

      // 2. Clear server-side session & cache
      await safeSignOut();
    } catch (err) {
      // Log but don't block — the redirect MUST happen
      console.warn("[LogoutButton] Error during sign out:", err);
    } finally {
      // 3. GUARANTEED hard redirect — prevents WSoD by forcing
      //    a full page load to /auth/login instead of relying
      //    on router.push which can leave a blank shell
      window.location.href = "/auth/login";
    }
  };

  return (
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
  );
}
