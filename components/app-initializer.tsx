"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

interface AppInitializerProps {
  children: React.ReactNode;
}

export function AppInitializer({ children }: AppInitializerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const supabase = createClient();

        // Check authentication status
        const { data: { session } } = await supabase.auth.getSession();

        // Preload essential data
        await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('services').select('*'),
        ]);

        // Redirect based on auth status
        if (session) {
          router.push('/home');
        } else {
          router.push('/login');
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("[App Initialization Error]:", error);
        toast.error("Failed to initialize application. Please try again.");
        router.push('/error');
      }
    };

    initializeApp();
  }, [router]);

  if (!isInitialized) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <LoadingSpinner className="h-12 w-12" />
      </div>
    );
  }

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
