import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getMentorBySlug,
  formatMentorDate,
  MENTOR_BATCH_LABELS,
  type Mentor,
} from "@/lib/mentors";
import { fmtDate } from "@/lib/fmt-date";

const STATUS_STYLES: Record<Mentor["status"], string> = {
  active: "bg-olive-tint text-olive",
  extracted: "bg-gold-tint text-gold",
  collecting: "bg-border text-muted",
};

const STATUS_LABELS: Record<Mentor["status"], string> = {
  active: "Active",
  extracted: "Extracted",
  collecting: "Collecting",
};

export default async function MentorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mentor = await getMentorBySlug(slug);

  if (!mentor) notFound();

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-xs text-muted mb-2">
          <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
          {" › "}
          <Link href="/intelligence" className="hover:text-dark transition-colors">Intelligence</Link>
          {" › "}
          <span className="text-dark">{mentor.name}</span>
        </p>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-serif text-dark leading-tight">{mentor.name}</h1>
              <span className="text-sm text-muted italic">({mentor.agent_name})</span>
            </div>
            <p className="text-sm text-muted">{mentor.domain}</p>
          </div>
          <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 shrink-0 ${STATUS_STYLES[mentor.status]}`}>
            {STATUS_LABELS[mentor.status]}
          </span>
        </div>
      </div>

      {/* ── Worldview + stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_280px] gap-6 mb-10">

        <div className="bg-white border border-border p-5">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-3">
            Worldview
          </p>
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${mentor.worldview ? "text-dark" : "text-muted italic"}`}>
            {mentor.worldview ?? "Worldview not yet extracted."}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-white border border-border p-4">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
              Sources
            </p>
            <p className="text-3xl font-serif text-dark">{mentor.source_count}</p>
          </div>

          <div className="bg-white border border-border p-4">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
              Batches complete
            </p>
            <p className="text-3xl font-serif text-dark">
              {mentor.batches_complete}/{mentor.batch_total}
            </p>
          </div>

          <div className="bg-white border border-border p-4">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
              Last refreshed
            </p>
            <p className="text-sm text-dark">{formatMentorDate(mentor.last_updated)}</p>
            <p className="text-xs text-muted mt-0.5">{mentor.refresh_cadence}</p>
          </div>

          <div className="bg-white border border-border p-4">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted mb-1">
              Added
            </p>
            <p className="text-sm text-dark">{fmtDate(mentor.created_at)}</p>
          </div>
        </div>
      </div>

      {/* ── Extraction progress ─────────────────────────────────────────────── */}
      <div className="mb-10">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-accent mb-1">
          Extraction pipeline
        </p>
        <h2 className="text-xl font-serif text-dark mb-4">
          Batch progress
        </h2>
        <div className="flex flex-col gap-2">
          {MENTOR_BATCH_LABELS.map((label, i) => {
            const complete = i < mentor.batches_complete;
            return (
              <div
                key={label}
                className="bg-white border border-border p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-5 h-5 shrink-0 flex items-center justify-center text-[10px] font-semibold ${
                      complete ? "bg-olive-tint text-olive" : "bg-border text-muted"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm text-dark">{label}</span>
                </div>
                <span className={`text-xs ${complete ? "text-olive" : "text-muted"}`}>
                  {complete ? "Complete" : "Pending"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
