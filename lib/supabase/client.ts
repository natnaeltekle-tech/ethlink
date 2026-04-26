import { createBrowserClient } from "@supabase/ssr";
import { Database } from "../database.types";
import { Capacitor, CapacitorHttp } from "@capacitor/core";

const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  
  try {
    if (Capacitor.isNativePlatform()) {
      const headers: Record<string, string> = {};
      
      if (init?.headers) {
        new Headers(init.headers).forEach((value, key) => {
          headers[key] = value;
        });
      }

      // Convert body to appropriate format if it exists
      let requestData = init?.body;
      if (typeof requestData === 'string') {
        try { requestData = JSON.parse(requestData); } catch {}
      }

      const response = await CapacitorHttp.request({
        url,
        method: init?.method || 'GET',
        headers,
        data: requestData
      });

      // Capacitor parses json responses automatically. If it's an object, stringify it
      // so we can construct a Response.
      const bodyData = typeof response.data === 'object' ? JSON.stringify(response.data) : response.data;

      return new Response(bodyData, {
        status: response.status,
        headers: new Headers(response.headers as Record<string, string>)
      });
    }

    // Use standard fetch for web
    return await fetch(url, init);
  } catch (error) {
    console.error("[Supabase Fetch Error]:", error);
    throw error;
  }
};

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  console.log("Supabase client init with URL:", supabaseUrl ? "present" : "MISSING");
  console.log("Supabase client init with KEY:", supabaseAnonKey ? "present" : "MISSING");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
    throw new Error('Missing required Supabase environment variables. Please check your .env.local file or Vercel environment settings.');
  }

  // Log the configuration (first 20 chars of key for security)
  console.log("=== Supabase Client Configuration ===");
  console.log("URL:", supabaseUrl);
  console.log("Key (first 20 chars):", supabaseAnonKey.substring(0, 20) + "...");
  console.log("================================");

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      fetch: customFetch
    }
  });
}
