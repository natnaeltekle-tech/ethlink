'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { App } from '@capacitor/app';

export function CapacitorBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
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
  }, [pathname, router]);

  return null;
}
