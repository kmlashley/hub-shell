import { createServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Suspense } from "react";
import SettingsTabs from "@/components/settings/SettingsTabs";

export const dynamic = "force-dynamic";

// ─── Data ──────────────────────────────────────────────────────────────────────

async function getSettings(): Promise<Record<string, string>> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("hub_settings")
    .select("key, value");

  if (error || !data) return {};
  return Object.fromEntries(data.map((r) => [r.key, r.value]));
}

function getEnvStatus(): Record<string, boolean> {
  return {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    FIRECRAWL_API_KEY: !!process.env.FIRECRAWL_API_KEY,
    PERPLEXITY_API_KEY: !!process.env.PERPLEXITY_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function SettingsPage() {
  const [settings, envStatus] = await Promise.all([
    getSettings(),
    Promise.resolve(getEnvStatus()),
  ]);

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted mb-2">
          <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
          {" › "}
          <span className="text-dark">Settings</span>
        </p>
        <h1 className="text-2xl font-serif text-dark mb-1">Settings</h1>
        <p className="text-sm text-muted">Configure your hub — brand, content pillars, integrations, and agent defaults.</p>
      </div>

      <Suspense fallback={null}>
        <SettingsTabs initialSettings={settings} envStatus={envStatus} />
      </Suspense>
    </div>
  );
}
