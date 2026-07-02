import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { updateReviewStatus } from "@/lib/review/queries";
import type { FeedbackPayload } from "@/lib/review/types";

const ACTION_STATUS = {
  approve: "approved",
  reject: "rejected",
  redirect: "redirected",
} as const;

export async function POST(request: NextRequest) {
  const body: FeedbackPayload = await request.json();
  const { id, action, notes, route_to } = body;

  if (!id || !action) {
    return NextResponse.json({ error: "id and action are required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const newStatus = ACTION_STATUS[action];

  try {
    await updateReviewStatus(supabase, id, newStatus, notes, route_to);
    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
