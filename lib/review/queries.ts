import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReviewItem, ReviewStatus } from "./types";

export async function getReviewItems(
  supabase: SupabaseClient,
  status: ReviewStatus = "ready",
  limit = 50
): Promise<ReviewItem[]> {
  const { data, error } = await supabase
    .from("agent_outputs")
    .select("*")
    .eq("status", status)
    .order("priority_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch review items: ${error.message}`);
  return (data ?? []) as ReviewItem[];
}

export async function getPendingCount(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from("agent_outputs")
    .select("*", { count: "exact", head: true })
    .eq("status", "ready");

  if (error) return 0;
  return count ?? 0;
}

export async function updateReviewStatus(
  supabase: SupabaseClient,
  id: string,
  status: ReviewStatus,
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from("agent_outputs")
    .update({
      status,
      human_notes: notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`Failed to update review status: ${error.message}`);
}
