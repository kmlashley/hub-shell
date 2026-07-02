import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createServerClient();

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [offersRes, seqRes, campaignsRes, revenueRes, recentRevenueRes, recentCampaignsRes] =
    await Promise.all([
      supabase
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("email_sequences")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("revenue_entries")
        .select("amount")
        .gte("date", monthStart),
      supabase
        .from("revenue_entries")
        .select("id, stream, amount, description, date")
        .order("date", { ascending: false })
        .limit(5),
      supabase
        .from("campaigns")
        .select("id, name, status, type, start_date, end_date")
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

  const revenueThisMonth = (revenueRes.data ?? []).reduce(
    (sum, e) => sum + (e.amount ?? 0),
    0
  );

  return NextResponse.json({
    activeOffers: offersRes.count ?? 0,
    sequencesRunning: seqRes.count ?? 0,
    activeCampaigns: campaignsRes.count ?? 0,
    revenueThisMonth,
    recentRevenue: recentRevenueRes.data ?? [],
    recentCampaigns: recentCampaignsRes.data ?? [],
  });
}
