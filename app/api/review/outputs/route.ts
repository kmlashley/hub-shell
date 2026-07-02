import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getReviewItems, getReviewItemsByStatuses } from "@/lib/review/queries";
import type { ReviewStatus } from "@/lib/review/types";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);

  const statusesParam = searchParams.get("statuses");
  const status = (searchParams.get("status") ?? "ready") as ReviewStatus;
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);

  try {
    let items;
    if (statusesParam) {
      const statuses = statusesParam.split(",").map((s) => s.trim()) as ReviewStatus[];
      items = await getReviewItemsByStatuses(supabase, statuses, limit);
    } else {
      items = await getReviewItems(supabase, status, limit);
    }
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch items" },
      { status: 500 }
    );
  }
}
