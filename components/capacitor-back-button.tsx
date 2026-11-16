'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { toast } from 'sonner';
import { runBackHandler } from '@/lib/native/back-handler';

const HOME_PATHS = ['/', '/home'];

/**
 * Android hardware Back button:
 *  1. close the top-most open panel (chat, filters, sheets, menus…)
 *  2. otherwise go back in history
 *  3. opened from a link/notification with no history → go to Home
 *  4. on Home → press twice to exit
 */
export function CapacitorBackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const lastPress = useRef(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let remove: (() => void) | undefined;
    App.addListener('backButton', ({ canGoBack }) => {
      if (runBackHandler()) return;

      const path = pathRef.current ?? '/';
      if (HOME_PATHS.includes(path)) {
        const now = Date.now();
        if (now - lastPress.current < 2000) {
          void App.exitApp();
        } else {
          lastPress.current = now;
          toast('Press back again to exit', { duration: 2000 });
        }
        return;
      }

      if (canGoBack || window.history.length > 1) router.back();
      else router.replace('/');
    })
      .then((l) => { remove = () => void l.remove(); })
      .catch((error) => console.error('CapacitorBackButton: failed to register listener', error));

    return () => remove?.();
  }, [router]);

  return null;
}
