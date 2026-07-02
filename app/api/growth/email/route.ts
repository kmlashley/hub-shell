import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// ─── Config ────────────────────────────────────────────────────────────────────
// Set these in .env.local:
//   EMAIL_PLATFORM=kit          (supported: kit, convertkit)
//   EMAIL_PLATFORM_API_KEY=...
//
// To add another platform (Bento, Beehiiv, MailerLite), add a fetch function
// below and a case in the GET handler.

const PLATFORM = (process.env.EMAIL_PLATFORM ?? "kit").toLowerCase();
const API_KEY = process.env.EMAIL_PLATFORM_API_KEY;
const CACHE_MINUTES = 60;

// ─── Kit (ConvertKit) ──────────────────────────────────────────────────────────

async function fetchKitData() {
  const h = {
    "X-Kit-Api-Key": API_KEY!,
    "Content-Type": "application/json",
  };

  const [subRes, bcastRes, seqRes] = await Promise.all([
    fetch("https://api.kit.com/v4/subscribers?sort_order=desc&per_page=25", { headers: h }),
    fetch("https://api.kit.com/v4/broadcasts?sort_order=desc&per_page=15", { headers: h }),
    fetch("https://api.kit.com/v4/sequences", { headers: h }),
  ]);

  const subData = subRes.ok ? await subRes.json() : {};
  const bcastData = bcastRes.ok ? await bcastRes.json() : {};
  const seqData = seqRes.ok ? await seqRes.json() : {};

  // Normalize subscribers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscribers = (subData.subscribers ?? []).map((s: any) => ({
    id: s.id,
    email: s.email_address,
    created_at: s.created_at,
    source: s.fields?.source ?? null,
    tags: (s.tags ?? []).map((t: { name: string }) => t.name),
  }));

  const totalSubscribers: number = subData.pagination?.total_count ?? subscribers.length;

  // Count signups this calendar month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const growthThisMonth = subscribers.filter(
    (s: { created_at: string }) => new Date(s.created_at) >= monthStart
  ).length;

  // Normalize broadcasts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const broadcasts = (bcastData.broadcasts ?? []).map((b: any) => ({
    id: b.id,
    subject: b.subject ?? "(No subject)",
    sent_at: b.send_at ?? b.created_at ?? null,
    status: b.published_at ? "sent" : "draft",
    recipients: b.stats?.recipients ?? null,
    open_rate: b.stats?.open_rate ?? null,
    click_rate: b.stats?.click_rate ?? null,
    unsubscribes: b.stats?.unsubscribes ?? null,
  }));

  // Normalize sequences
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sequences = (seqData.sequences ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    hold: s.hold ?? false,
    created_at: s.created_at,
  }));

  return {
    platform: "kit",
    overview: {
      totalSubscribers,
      growthThisMonth,
      activeSequences: sequences.filter((s: { hold: boolean }) => !s.hold).length,
    },
    subscribers,
    broadcasts,
    sequences,
  };
}

// ─── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ connected: false });
  }

  const force = new URL(request.url).searchParams.get("force") === "1";
  const supabase = createServerClient();

  // Return cached snapshot unless force-refresh requested
  if (!force) {
    const since = new Date(Date.now() - CACHE_MINUTES * 60 * 1000).toISOString();
    const { data: cached } = await supabase
      .from("email_snapshots")
      .select("id, data_json, recorded_at")
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .single();

    if (cached) {
      return NextResponse.json({
        connected: true,
        data: cached.data_json,
        cached: true,
        recorded_at: cached.recorded_at,
      });
    }
  }

  // Fetch fresh from platform
  try {
    let data;
    if (PLATFORM === "kit" || PLATFORM === "convertkit") {
      data = await fetchKitData();
    } else {
      return NextResponse.json({
        connected: false,
        error: `Platform "${PLATFORM}" is not yet supported. Set EMAIL_PLATFORM=kit to use Kit/ConvertKit.`,
      });
    }

    await supabase.from("email_snapshots").insert({ data_json: data });

    return NextResponse.json({
      connected: true,
      data,
      cached: false,
      recorded_at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { connected: false, error: `API fetch failed: ${String(err)}` },
      { status: 500 }
    );
  }
}
