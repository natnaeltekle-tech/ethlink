"use client";

import { useEffect } from "react";

export function SWCleaner() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Unregister every service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    }

    // Wipe all caches (including the old index.html shell)
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
  }, []);

  return null;
}
