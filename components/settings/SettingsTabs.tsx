"use client";

import { useState } from "react";

type Tab = "general" | "integrations" | "agent-defaults";

interface Props {
  initialSettings: Record<string, string>;
  envStatus: Record<string, boolean>;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "integrations", label: "Integrations" },
  { id: "agent-defaults", label: "Agent Defaults" },
];

const INTEGRATIONS = [
  {
    key: "ANTHROPIC_API_KEY",
    label: "Claude (Anthropic)",
    desc: "Powers all AI agent calls in the hub.",
    docsHint: "Get your key at console.anthropic.com",
  },
  {
    key: "FIRECRAWL_API_KEY",
    label: "Firecrawl",
    desc: "Used by research agents to scrape competitor sites and Substack.",
    docsHint: "Get your key at firecrawl.dev",
  },
  {
    key: "PERPLEXITY_API_KEY",
    label: "Perplexity",
    desc: "Used for live search data in keyword and SEO research.",
    docsHint: "Get your key at perplexity.ai/api",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    label: "Supabase",
    desc: "Your hub database. Connected via NEXT_PUBLIC_SUPABASE_URL.",
    docsHint: "Configured in your Supabase project settings",
  },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

export default function SettingsTabs({ initialSettings, envStatus }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function update(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setSaveError(null);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.error ?? "Save failed. Make sure the hub_settings table exists.");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setSaveError("Network error. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  const generalFields = [
    { key: "hub_name", label: "Hub name", placeholder: "My Hub", type: "text" as const },
    { key: "hub_tagline", label: "Tagline", placeholder: "Your AI Business OS", type: "text" as const },
  ];

  const agentDefaultFields = [
    {
      key: "default_tone",
      label: "Default voice / tone",
      placeholder: "Direct, warm, practical",
      type: "text" as const,
      hint: "Pre-fills the tone field on all agent forms.",
    },
    {
      key: "default_audience",
      label: "Default audience description",
      placeholder: "Describe your ideal reader or buyer in 1–2 sentences.",
      type: "textarea" as const,
      hint: "Pre-fills the audience field on all agent forms.",
    },
    {
      key: "your_name",
      label: "Your name",
      placeholder: "Jane Smith",
      type: "text" as const,
      hint: "Used in agent prompts and copy generation.",
    },
    {
      key: "your_niche",
      label: "Your niche",
      placeholder: "I help [audience] do [thing].",
      type: "textarea" as const,
      hint: "Injected into every research and content agent prompt.",
    },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-border mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-dark"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General */}
      {activeTab === "general" && (
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-border p-6">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-4">
              Hub identity
            </p>
            <div className="flex flex-col gap-5">
              {generalFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-dark mb-1.5">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={settings[field.key] ?? ""}
                    onChange={(e) => update(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-dark mb-1.5">
                  Timezone
                </label>
                <select
                  value={settings["timezone"] ?? "America/New_York"}
                  onChange={(e) => update("timezone", e.target.value)}
                  className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <SaveRow saving={saving} saved={saved} error={saveError} onSave={save} />
        </div>
      )}

      {/* Integrations */}
      {activeTab === "integrations" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-border p-6">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
              API integrations
            </p>
            <p className="text-xs text-muted mb-6">
              API keys are never stored in the database. Set them in{" "}
              <code className="font-mono text-dark text-[11px]">.env.local</code> and
              redeploy. This panel shows which keys are currently detected.
            </p>

            <div className="flex flex-col gap-4">
              {INTEGRATIONS.map((integration) => {
                const isSet = envStatus[integration.key] ?? false;
                return (
                  <div
                    key={integration.key}
                    className="flex items-start justify-between gap-4 py-4 border-b border-border last:border-0 last:pb-0 first:pt-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-dark mb-0.5">{integration.label}</p>
                      <p className="text-xs text-muted mb-1">{integration.desc}</p>
                      <code className="text-[11px] font-mono text-ink-3">{integration.key}</code>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${
                          isSet
                            ? "bg-olive-tint text-olive"
                            : "bg-rust-tint text-accent"
                        }`}
                      >
                        {isSet ? "Set" : "Not set"}
                      </span>
                      {!isSet && (
                        <p className="text-[11px] text-muted text-right">{integration.docsHint}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border border-dashed border-border p-4">
            <p className="text-xs text-muted">
              To update a key:{" "}
              <span className="font-mono text-dark text-[11px]">
                echo 'ANTHROPIC_API_KEY=sk-...' &gt;&gt; .env.local
              </span>
              {" "}then restart your dev server. On Vercel, set keys in your project environment variables.
            </p>
          </div>
        </div>
      )}

      {/* Agent Defaults */}
      {activeTab === "agent-defaults" && (
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-border p-6">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
              Agent defaults
            </p>
            <p className="text-xs text-muted mb-6">
              These values pre-fill every agent form in the hub. Set them once here and
              stop retyping them on every run.
            </p>

            <div className="flex flex-col gap-5">
              {agentDefaultFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-dark mb-1">
                    {field.label}
                  </label>
                  {field.hint && (
                    <p className="text-xs text-muted mb-1.5">{field.hint}</p>
                  )}
                  {field.type === "textarea" ? (
                    <textarea
                      value={settings[field.key] ?? ""}
                      onChange={(e) => update(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={settings[field.key] ?? ""}
                      onChange={(e) => update(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <SaveRow saving={saving} saved={saved} error={saveError} onSave={save} />
        </div>
      )}
    </div>
  );
}

// ─── Save row ──────────────────────────────────────────────────────────────────

function SaveRow({
  saving,
  saved,
  error,
  onSave,
}: {
  saving: boolean;
  saved: boolean;
  error: string | null;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        {error && <p className="text-sm text-accent">{error}</p>}
        {saved && <p className="text-sm text-olive">Saved.</p>}
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="bg-primary text-white text-sm font-medium px-5 py-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
