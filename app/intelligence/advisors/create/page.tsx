"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PRESET_COLORS = [
  { hex: "#0f6b70", label: "Teal" },
  { hex: "#a3320b", label: "Rust" },
  { hex: "#4e0f70", label: "Purple" },
  { hex: "#5c700f", label: "Olive" },
  { hex: "#efa00b", label: "Gold" },
  { hex: "#1a3a5a", label: "Navy" },
  { hex: "#14272a", label: "Ink" },
  { hex: "#6b7a7d", label: "Slate" },
];

export default function CreateAdvisorPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [avatarColor, setAvatarColor] = useState(PRESET_COLORS[0].hex);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name.trim() || !specialty.trim() || !systemPrompt.trim()) {
      setError("All fields are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/advisors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          specialty: specialty.trim(),
          system_prompt: systemPrompt.trim(),
          avatar_color: avatarColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save advisor.");
        setSaving(false);
        return;
      }
      router.push(`/intelligence/advisors/${data.advisor.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  const hasPreview = name.trim() || specialty.trim() || systemPrompt.trim();

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-xs text-muted mb-2">
          <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
          {" › "}
          <Link href="/intelligence" className="hover:text-dark transition-colors">Intelligence</Link>
          {" › "}
          <Link href="/intelligence/advisors" className="hover:text-dark transition-colors">AI Advisors</Link>
          {" › "}
          <span className="text-dark">Add Advisor</span>
        </p>
        <h1 className="text-3xl font-serif text-dark mb-1">Add Advisor</h1>
        <p className="text-sm text-muted">
          Define a specialist persona. Name them anything — a framework, an expert you learn from, or a role you need filled.
        </p>
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-8">

        {/* ── Form ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Positioning Advisor, Email Copywriter, Buyer Psychology Expert"
              className="w-full border border-border px-3 py-2.5 text-sm text-dark placeholder:text-muted/60 focus:outline-none focus:border-primary"
            />
          </div>

          {/* Specialty */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1.5">
              Specialty
              <span className="text-muted font-normal ml-1">— one line</span>
            </label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="e.g. Positioning strategy and market differentiation"
              className="w-full border border-border px-3 py-2.5 text-sm text-dark placeholder:text-muted/60 focus:outline-none focus:border-primary"
            />
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1.5">
              System Prompt
              <span className="text-muted font-normal ml-1">— the full persona instructions</span>
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={`You are a positioning strategist with deep expertise in market differentiation and competitive analysis.\n\nWhen reviewing content, you focus on:\n- Whether the positioning is clear and ownable\n- How the offer is differentiated from alternatives\n- Whether the target audience is specific enough\n\nYou give direct, specific feedback — not vague suggestions.`}
              rows={12}
              className="w-full border border-border px-3 py-2.5 text-sm text-dark placeholder:text-muted/50 focus:outline-none focus:border-primary resize-none font-mono leading-relaxed"
            />
            <p className="text-xs text-muted mt-1.5">
              {systemPrompt.length} characters · This becomes the AI&apos;s persona when running critiques.
            </p>
          </div>

          {/* Avatar color */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-2">
              Avatar color
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setAvatarColor(c.hex)}
                  title={c.label}
                  className={`w-8 h-8 transition-all ${
                    avatarColor === c.hex
                      ? "ring-2 ring-offset-2 ring-dark scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-accent border border-accent/20 bg-rust-tint px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-white text-sm font-medium px-5 py-2.5 hover:bg-primary-hover disabled:opacity-40 transition-colors"
            >
              {saving ? "Saving…" : "Save advisor"}
            </button>
            <Link
              href="/intelligence/advisors"
              className="text-sm text-muted hover:text-dark transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>

        {/* ── Live preview ──────────────────────────────────────────────────── */}
        <div className="sticky top-8">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-3">
            Preview
          </p>

          {!hasPreview ? (
            <div className="border border-dashed border-border p-8 text-center">
              <p className="text-xs text-muted">Start typing to see your advisor card.</p>
            </div>
          ) : (
            <div className="bg-white border border-border p-5">
              <div className="flex items-start gap-4 mb-3">
                <div
                  className="w-10 h-10 shrink-0 flex items-center justify-center text-white text-sm font-semibold"
                  style={{ backgroundColor: avatarColor }}
                >
                  {name.trim().charAt(0).toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-sm font-medium text-dark leading-snug">
                    {name.trim() || <span className="text-muted italic">Advisor name</span>}
                  </p>
                  <p className="text-xs text-muted mt-0.5 leading-snug">
                    {specialty.trim() || <span className="italic">Specialty</span>}
                  </p>
                </div>
              </div>

              {systemPrompt.trim() && (
                <p className="text-xs text-muted leading-relaxed line-clamp-3 pl-14 mb-4">
                  {systemPrompt.trim().slice(0, 160)}
                  {systemPrompt.trim().length > 160 ? "…" : ""}
                </p>
              )}

              <div className="border-t border-border pt-3">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
                  What this advisor focuses on
                </p>
                <p className="text-xs text-dark leading-relaxed">
                  {specialty.trim()
                    ? specialty.trim()
                    : <span className="text-muted italic">Fill in the specialty field above.</span>}
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-muted mt-3 leading-relaxed">
            The system prompt becomes this advisor&apos;s complete persona when running critiques. Be specific about what they focus on, how they give feedback, and what frameworks they use.
          </p>
        </div>
      </div>
    </div>
  );
}
