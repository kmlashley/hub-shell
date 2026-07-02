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

export async function getReviewItemsByStatuses(
  supabase: SupabaseClient,
  statuses: ReviewStatus[],
  limit = 100
): Promise<ReviewItem[]> {
  const { data, error } = await supabase
    .from("agent_outputs")
    .select("*")
    .in("status", statuses)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch review items: ${error.message}`);
  return (data ?? []) as ReviewItem[];
}

export async function getReviewItem(
  supabase: SupabaseClient,
  id: string
): Promise<ReviewItem | null> {
  const { data, error } = await supabase
    .from("agent_outputs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as ReviewItem | null;
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
  notes?: string,
  routeTo?: string
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status,
    human_notes: notes ?? null,
    updated_at: new Date().toISOString(),
  };

  if (routeTo) {
    const { data: existing } = await supabase
      .from("agent_outputs")
      .select("metadata")
      .eq("id", id)
      .single();
    const current =
      (existing as { metadata: Record<string, unknown> | null } | null)?.metadata ?? {};
    updateData.metadata = { ...current, route_to: routeTo };
  }

  const { error } = await supabase
    .from("agent_outputs")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(`Failed to update review status: ${error.message}`);
}
