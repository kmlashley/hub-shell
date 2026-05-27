"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client — safe to use in client components.
// Uses the anon key only (respects Row Level Security).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
