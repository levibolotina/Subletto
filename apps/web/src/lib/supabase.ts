import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Browser client — uses anon key, respects RLS
export const createBrowserClient = () =>
  createClient(supabaseUrl, supabaseAnonKey);

// Server admin client — uses service role key, bypasses RLS
// Use ONLY in server-side code (Route Handlers, Server Actions, Server Components)
export const createAdminClient = () =>
  createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
