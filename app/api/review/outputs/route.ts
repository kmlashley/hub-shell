import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { getReviewItems } from "@/lib/review/queries";
import type { ReviewStatus } from "@/lib/review/types";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") ?? "ready") as ReviewStatus;
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  try {
    const items = await getReviewItems(supabase, status, limit);
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch items" },
      { status: 500 }
    );
  }
}
