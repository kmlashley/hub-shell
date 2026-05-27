import { createClient } from "@supabase/supabase-js";

// Server-side client for use in API routes and server components.
// Falls back to anon key if service role key is not set, but most
// write operations in API routes need the service role key.
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
