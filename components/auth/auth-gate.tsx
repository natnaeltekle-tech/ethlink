"use client";

import { useEffect, useState } from "react";
import { Handshake } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function Loading() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <div className="bg-primary/10 p-4 rounded-full animate-pulse">
        <Handshake className="h-12 w-12 text-primary" />
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(() => {
      setIsReady(true);
    });
  }, []);

  if (!isReady) {
    return <Loading />;
  }

  return <>{children}</>;
}
