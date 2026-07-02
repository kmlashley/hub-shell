"use client";

import { useState } from "react";

const TIER_CONFIG = {
  low: { label: "Low", color: "text-muted", bg: "bg-light", desc: "Under $100" },
  mid: { label: "Mid", color: "text-primary", bg: "bg-teal-tint", desc: "$100–$999" },
  high: { label: "High", color: "text-purple", bg: "bg-purple-tint", desc: "$1k–$4.9k" },
  premium: { label: "Premium", color: "text-gold", bg: "bg-gold-tint", desc: "$5k+" },
} as const;

type PriceTier = keyof typeof TIER_CONFIG;

interface OfferItem {
  name: string;
  creator: string;
  price_point: string;
  price_tier: PriceTier;
  format: string;
  positioning: string;
  what_it_includes: string;
}

interface PositioningPattern {
  pattern: string;
  who_uses_it: string;
  example: string;
}

interface PricingGap {
  price_range: string;
  what_is_missing: string;
  why_the_gap_exists: string;
}

interface DifferentiationOpportunity {
  angle: string;
  positioning: string;
  why_you_could_own_it: string;
}

interface OfferIntelResult {
  landscape_summary: string;
  offers: OfferItem[];
  positioning_patterns: PositioningPattern[];
  pricing_gaps: PricingGap[];
  differentiation_opportunities: DifferentiationOpportunity[];
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-4">
      {label}
    </p>
  );
}

export default function OfferIntelPage() {
  const [niche, setNiche] = useState("");
  const [audience, setAudience] = useState("");
  const [competitorInput, setCompetitorInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OfferIntelResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const competitors = competitorInput
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  async function handleResearch() {
    if (!niche.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const res = await fetch("/api/content/offer-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, audience, competitors }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Research failed");
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      await fetch("/api/content/offer-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, audience, competitors, results: result, save: true }),
      });
      setSaved(true);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-dark mb-1">Offer Intelligence</h1>
        <p className="text-sm text-muted">
          Map the competitive offer landscape in your niche. Find the pricing gaps and positioning angles no one owns yet.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white border border-border p-5 mb-4">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
                Your Niche
              </label>
              <input
                type="text"
                className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
                placeholder="e.g. AI tools for content creators"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
                Target Audience{" "}
                <span className="normal-case font-normal tracking-normal">(optional)</span>
              </label>
              <input
                type="text"
                className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
                placeholder="e.g. solopreneurs earning $50–150k"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-muted block mb-1.5">
              Specific Competitors{" "}
              <span className="normal-case font-normal tracking-normal">(optional — comma-separated names or URLs)</span>
            </label>
            <input
              type="text"
              className="w-full text-sm text-dark placeholder:text-muted bg-transparent outline-none border border-border px-3 py-2 focus:border-primary/50 transition-colors"
              placeholder="e.g. Justin Welsh, Dickie Bush, nicolascole.com"
              value={competitorInput}
              onChange={(e) => setCompetitorInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResearch()}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleResearch}
              disabled={loading || !niche.trim()}
              className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Mapping landscape…" : "Map offer landscape"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rust-tint border border-accent/30 text-accent text-sm px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white border border-border p-8 text-center mb-4">
          <p className="text-sm text-muted">Researching offers and pricing patterns…</p>
          <p className="text-xs text-muted mt-1.5">Takes 20–40 seconds.</p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">

          {/* Landscape summary */}
          <div className="bg-white border border-border p-5">
            <SectionHeader label="Landscape Overview" />
            <p className="text-sm text-dark leading-relaxed">{result.landscape_summary}</p>
          </div>

          {/* Offer map */}
          <div className="bg-white border border-border p-5">
            <SectionHeader label="Offer Landscape Map" />
            {/* Group by tier */}
            {(["premium", "high", "mid", "low"] as PriceTier[]).map((tier) => {
              const tierOffers = result.offers.filter((o) => o.price_tier === tier);
              if (!tierOffers.length) return null;
              const cfg = TIER_CONFIG[tier];
              return (
                <div key={tier} className="mb-5 last:mb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-muted">{cfg.desc}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {tierOffers.map((offer, i) => (
                      <div key={i} className="border border-border px-4 py-3">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <div>
                            <p className="text-sm font-medium text-dark">{offer.name}</p>
                            <p className="text-xs text-muted">{offer.creator} · {offer.format}</p>
                          </div>
                          <span className="text-sm font-medium text-dark shrink-0">{offer.price_point}</span>
                        </div>
                        <p className="text-xs text-dark/70 leading-snug mb-1">{offer.positioning}</p>
                        <p className="text-xs text-muted leading-snug">{offer.what_it_includes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Positioning patterns */}
          <div className="bg-white border border-border p-5">
            <SectionHeader label="Positioning Patterns" />
            <div className="flex flex-col gap-3">
              {result.positioning_patterns.map((pp, i) => (
                <div key={i} className="border border-border p-4">
                  <p className="text-sm font-medium text-dark mb-1">{pp.pattern}</p>
                  <p className="text-xs text-muted leading-snug mb-2">
                    <span className="font-medium text-dark/70">Used by: </span>
                    {pp.who_uses_it}
                  </p>
                  <p className="text-xs text-dark/60 italic leading-snug">{pp.example}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing gaps */}
          <div className="bg-white border border-border p-5">
            <SectionHeader label="Pricing Gaps" />
            <div className="flex flex-col gap-3">
              {result.pricing_gaps.map((gap, i) => (
                <div key={i} className="border border-border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 bg-gold-tint text-gold">
                      Gap
                    </span>
                    <p className="text-sm font-medium text-dark">{gap.price_range}</p>
                  </div>
                  <p className="text-xs text-dark leading-snug mb-2">{gap.what_is_missing}</p>
                  <p className="text-xs text-muted leading-snug">{gap.why_the_gap_exists}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Differentiation opportunities */}
          <div className="bg-white border border-border p-5">
            <SectionHeader label="Differentiation Opportunities" />
            <div className="flex flex-col gap-3">
              {result.differentiation_opportunities.map((opp, i) => (
                <div key={i} className="border border-border p-4">
                  <p className="text-sm font-medium text-dark mb-2">{opp.angle}</p>
                  <p className="text-xs text-dark leading-snug mb-3 italic">&ldquo;{opp.positioning}&rdquo;</p>
                  <div className="bg-rust-tint px-3 py-2.5">
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
                      Why you could own this
                    </p>
                    <p className="text-sm text-dark leading-snug">{opp.why_you_could_own_it}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pb-4">
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="text-sm border border-border px-4 py-2 text-muted hover:text-dark hover:border-dark/20 transition-colors disabled:opacity-40"
            >
              {saved ? "Saved as positioning reference ✓" : saving ? "Saving…" : "Save as positioning reference"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
