import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userContent, assistantContent, isFirst } = await request.json();

  const supabase = createServerClient();

  const { error } = await supabase.from("chat_messages").insert([
    { conversation_id: id, role: "user", content: userContent },
    { conversation_id: id, role: "assistant", content: assistantContent },
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (isFirst) {
    const title = userContent.slice(0, 60).trim();
    await supabase
      .from("chat_conversations")
      .update({ title })
      .eq("id", id);
  }

  return NextResponse.json({ success: true });
}
