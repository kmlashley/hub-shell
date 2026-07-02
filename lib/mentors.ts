import { createServerClient } from "@/lib/supabase-server";

export interface Mentor {
  id: string;
  slug: string;
  name: string;
  agent_name: string;
  domain: string;
  status: "active" | "extracted" | "collecting";
  source_count: number;
  batches_complete: number;
  batch_total: number;
  worldview: string | null;
  refresh_cadence: string;
  last_updated: string | null;
  created_at: string;
}

export const MENTOR_BATCH_TOTAL = 3;

export async function getMentors(): Promise<Mentor[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("mentors")
    .select("*")
    .order("created_at", { ascending: true });
  return (data ?? []) as Mentor[];
}

export function formatMentorDate(isoStr: string | null): string {
  if (!isoStr) return "Never";
  return new Date(isoStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
