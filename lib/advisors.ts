import { createServerClient } from "@/lib/supabase-server";

export interface Advisor {
  id: string;
  name: string;
  specialty: string;
  system_prompt: string;
  avatar_color: string;
  created_at: string;
}

export interface AdvisorCritique {
  id: string;
  advisor_id: string;
  subject: string;
  subject_type: string;
  input_content: string;
  critique_json: Record<string, unknown>;
  created_at: string;
}

export interface GeneratedCopy {
  id: string;
  critique_id: string | null;
  advisor_id: string;
  subject: string;
  subject_type: string;
  full_copy: string;
  applied: boolean;
  applied_notes: string | null;
  created_at: string;
}

export interface AdvisorPanelStats {
  advisorCount: number;
  lastCritiqueAt: string | null;
  copyCount: number;
}

export async function getAdvisors(): Promise<Advisor[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("advisors")
    .select("*")
    .order("created_at", { ascending: true });
  return (data ?? []) as Advisor[];
}

export async function getAdvisorById(id: string): Promise<Advisor | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("advisors")
    .select("*")
    .eq("id", id)
    .single();
  return (data ?? null) as Advisor | null;
}

export async function getAdvisorPanelStats(): Promise<AdvisorPanelStats> {
  const supabase = createServerClient();
  const [advisorRes, critiqueRes, copyRes] = await Promise.all([
    supabase.from("advisors").select("id", { count: "exact", head: true }),
    supabase
      .from("advisor_critiques")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("generated_copy").select("id", { count: "exact", head: true }),
  ]);
  return {
    advisorCount: advisorRes.count ?? 0,
    lastCritiqueAt: critiqueRes.data?.[0]?.created_at ?? null,
    copyCount: copyRes.count ?? 0,
  };
}

export async function getCritiquesForAdvisor(
  advisorId: string
): Promise<AdvisorCritique[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("advisor_critiques")
    .select("*")
    .eq("advisor_id", advisorId)
    .order("created_at", { ascending: false });
  return (data ?? []) as AdvisorCritique[];
}

export async function getAllCritiques(): Promise<
  (AdvisorCritique & { advisor_name: string })[]
> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("advisor_critiques")
    .select("*, advisors(name)")
    .order("created_at", { ascending: false });
  if (!data) return [];
  return data.map(
    (c: AdvisorCritique & { advisors?: { name: string } | null }) => ({
      ...c,
      advisor_name: c.advisors?.name ?? "Unknown",
    })
  ) as (AdvisorCritique & { advisor_name: string })[];
}

export async function getAllGeneratedCopy(): Promise<
  (GeneratedCopy & { advisor_name: string })[]
> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("generated_copy")
    .select("*, advisors(name)")
    .order("created_at", { ascending: false });
  if (!data) return [];
  return data.map(
    (c: GeneratedCopy & { advisors?: { name: string } | null }) => ({
      ...c,
      advisor_name: c.advisors?.name ?? "Unknown",
    })
  ) as (GeneratedCopy & { advisor_name: string })[];
}
