'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export function CapacitorBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      const listener = App.addListener('backButton', () => {
        if (pathname === '/') {
          App.exitApp();
        } else {
          router.back();
        }
      });

      return () => {
        listener.then((l) => l.remove());
      };
    } catch (error) {
      console.error('CapacitorBackButton: Failed to register listener', error);
    }
  }, [pathname, router]);

  return null;
}
