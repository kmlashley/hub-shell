import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("advisors")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ advisors: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, specialty, system_prompt, avatar_color } = body;

  if (!name?.trim() || !specialty?.trim() || !system_prompt?.trim()) {
    return NextResponse.json({ error: "name, specialty, and system_prompt are required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("advisors")
    .insert({
      name: name.trim(),
      specialty: specialty.trim(),
      system_prompt: system_prompt.trim(),
      avatar_color: avatar_color ?? "#0f6b70",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ advisor: data });
}
