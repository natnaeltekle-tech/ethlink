"use client";

import { Loader2 } from "lucide-react";

/**
 * Full-screen overlay shown during the logout transition.
 * Prevents the "White Screen of Death" by covering the viewport
 * while the session is being cleared and the redirect is pending.
 */
export function LogoutOverlay() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
      aria-live="polite"
      aria-label="Logging out"
    >
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      <p className="text-base font-medium text-muted-foreground">Logging out…</p>
    </div>
  );
}
