import { createClient } from "@supabase/supabase-js";

// Bypasses RLS — use only in server-side code (API routes, server components).
// NEVER import this in client components.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
