import { createBrowserClient } from "@supabase/ssr";
import { Database } from "../database.types";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables:');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:', supabaseKey ? 'Set' : 'Missing');
    throw new Error('Missing required Supabase environment variables. Please check your .env.local file or Vercel environment settings.');
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
