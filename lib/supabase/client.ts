import { createBrowserClient } from "@supabase/ssr";
import { Database } from "../types/database";
import { Capacitor, CapacitorHttp } from "@capacitor/core";

const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  try {
    if (Capacitor.isNativePlatform()) {
      const headers: Record<string, string> = {};

      if (init?.headers) {
        new Headers(init.headers).forEach((value, key) => {
          headers[key] = value;
        });
      }

      let requestData = init?.body;
      if (typeof requestData === "string") {
        try {
          requestData = JSON.parse(requestData);
        } catch {
          /* keep as string */
        }
      }

      const response = await CapacitorHttp.request({
        url,
        method: init?.method || "GET",
        headers,
        data: requestData,
      });

      const bodyData =
        typeof response.data === "object"
          ? JSON.stringify(response.data)
          : response.data;

      return new Response(bodyData, {
        status: response.status,
        headers: new Headers(response.headers as Record<string, string>),
      });
    }

    return await fetch(url, init);
  } catch (error) {
    console.error("[Supabase Fetch Error]:", error);
    throw error;
  }
};

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Soft-fail: never throw during module/render of native boot path.
  // Callers should handle missing client; throwing here caused black screens.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
    // Still create with placeholders so call sites don't crash on import;
    // requests will fail loudly in network logs instead of blanking the UI.
    return createBrowserClient<Database>(
      supabaseUrl || "https://placeholder.supabase.co",
      supabaseAnonKey || "placeholder-anon-key",
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        global: { fetch: customFetch },
      }
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: customFetch,
    },
  });
}
