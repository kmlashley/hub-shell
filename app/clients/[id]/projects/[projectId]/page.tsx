"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { fmtDate, fmtRelative } from "@/lib/fmt-date";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Deliverable {
  id: string;
  text: string;
  done: boolean;
}

interface ProjectLink {
  id: string;
  label: string;
  url: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "paused" | "completed" | "archived";
  client_id: string | null;
  start_date: string | null;
  end_date: string | null;
  deliverables_json: { deliverables: Deliverable[]; links: ProjectLink[] } | null;
  created_at: string;
  clients: { id: string; name: string; company: string | null } | null;
}

const STATUS_OPTIONS = ["active", "paused", "completed", "archived"] as const;

const STATUS_BADGE: Record<string, string> = {
  active: "bg-teal-tint text-primary",
  paused: "bg-gold-tint text-gold",
  completed: "bg-purple-tint text-purple",
  archived: "bg-border text-muted",
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ClientProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id: clientId, projectId } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable header fields
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Project["status"]>("active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [editingHeader, setEditingHeader] = useState(false);

  // Deliverables
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [newDeliverable, setNewDeliverable] = useState("");

  // Links
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) {
      const { project: p } = await res.json() as { project: Project };
      setProject(p);
      setName(p.name);
      setStatus(p.status);
      setStartDate(p.start_date ?? "");
      setEndDate(p.end_date ?? "");
      setDescription(p.description ?? "");
      setDeliverables(p.deliverables_json?.deliverables ?? []);
      setLinks(p.deliverables_json?.links ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [projectId]);

  async function persistJson(nextDeliverables: Deliverable[], nextLinks: ProjectLink[]) {
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliverables_json: { deliverables: nextDeliverables, links: nextLinks },
      }),
    });
  }

  async function saveHeader(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        status,
        description: description.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
      }),
    });
    setEditingHeader(false);
    setSaving(false);
    await load();
  }

  // ── Deliverables ──

  async function addDeliverable() {
    if (!newDeliverable.trim()) return;
    const next = [
      ...deliverables,
      { id: crypto.randomUUID(), text: newDeliverable.trim(), done: false },
    ];
    setDeliverables(next);
    setNewDeliverable("");
    await persistJson(next, links);
  }

  async function toggleDeliverable(itemId: string) {
    const next = deliverables.map((d) =>
      d.id === itemId ? { ...d, done: !d.done } : d
    );
    setDeliverables(next);
    await persistJson(next, links);
  }

  async function deleteDeliverable(itemId: string) {
    const next = deliverables.filter((d) => d.id !== itemId);
    setDeliverables(next);
    await persistJson(next, links);
  }

  // ── Links ──

  async function addLink() {
    if (!newLinkUrl.trim()) return;
    const next = [
      ...links,
      {
        id: crypto.randomUUID(),
        label: newLinkLabel.trim() || newLinkUrl.trim(),
        url: newLinkUrl.trim(),
      },
    ];
    setLinks(next);
    setNewLinkLabel("");
    setNewLinkUrl("");
    await persistJson(deliverables, next);
  }

  async function deleteLink(linkId: string) {
    const next = links.filter((l) => l.id !== linkId);
    setLinks(next);
    await persistJson(deliverables, next);
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="h-32 bg-white border border-border animate-pulse mb-6" />
        <div className="h-64 bg-white border border-border animate-pulse" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-sm text-muted">Project not found.</p>
        <Link href={`/clients/${clientId}`} className="text-sm text-primary mt-2 inline-block hover:underline">
          ← Back to client
        </Link>
      </div>
    );
  }

  const done = deliverables.filter((d) => d.done).length;
  const progress = deliverables.length > 0 ? Math.round((done / deliverables.length) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto">

      {/* Breadcrumb */}
      <p className="text-xs text-muted mb-6">
        <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
        {" › "}
        <Link href="/clients" className="hover:text-dark transition-colors">Clients</Link>
        {" › "}
        <Link href={`/clients/${clientId}`} className="hover:text-dark transition-colors">
          {project.clients?.name ?? "Client"}
        </Link>
        {" › "}
        <span className="text-dark">{project.name}</span>
      </p>

      {/* Header */}
      <div className="bg-white border border-border p-6 mb-6">
        {editingHeader ? (
          <form onSubmit={saveHeader} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-dark mb-1">Project name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="What is this project about?"
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-dark mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Project["status"])}
                  className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark mb-1">Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark mb-1">Due date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="bg-primary text-white text-sm font-medium px-4 py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditingHeader(false)}
                className="px-4 py-1.5 border border-border text-sm text-muted hover:text-dark transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-2xl font-serif text-dark mb-1">{project.name}</h1>
                {project.description && (
                  <p className="text-sm text-muted">{project.description}</p>
                )}
              </div>
              <button
                onClick={() => setEditingHeader(true)}
                className="text-xs text-muted hover:text-dark transition-colors shrink-0 ml-4"
              >
                Edit
              </button>
            </div>

            <div className="flex items-center gap-6 flex-wrap">
              <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 capitalize ${STATUS_BADGE[project.status] ?? "bg-border text-muted"}`}>
                {project.status}
              </span>
              {project.start_date && (
                <span className="text-xs text-muted">
                  Started <span className="text-dark">{fmtDate(project.start_date)}</span>
                </span>
              )}
              {project.end_date && (
                <span className="text-xs text-muted">
                  Due <span className="text-dark font-medium">{fmtDate(project.end_date)}</span>
                </span>
              )}
              <span className="text-xs text-muted ml-auto">
                Created {fmtRelative(project.created_at)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Deliverables */}
      <div className="bg-white border border-border p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-dark">Deliverables</h2>
          {deliverables.length > 0 && (
            <span className="text-xs text-muted">{done}/{deliverables.length} done</span>
          )}
        </div>

        {/* Progress bar */}
        {deliverables.length > 0 && (
          <div className="h-1.5 bg-border mb-4">
            <div
              className="h-1.5 bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {deliverables.length === 0 && (
          <p className="text-sm text-muted mb-4">No deliverables yet. Add one below.</p>
        )}

        <ul className="flex flex-col gap-2 mb-4">
          {deliverables.map((d) => (
            <li key={d.id} className="flex items-center gap-3 group">
              <button
                onClick={() => toggleDeliverable(d.id)}
                className={`w-4 h-4 border shrink-0 flex items-center justify-center transition-colors ${
                  d.done ? "bg-primary border-primary" : "border-border hover:border-primary"
                }`}
              >
                {d.done && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span className={`text-sm flex-1 ${d.done ? "line-through text-muted" : "text-dark"}`}>
                {d.text}
              </span>
              <button
                onClick={() => deleteDeliverable(d.id)}
                className="text-xs text-muted hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        {/* Add deliverable */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newDeliverable}
            onChange={(e) => setNewDeliverable(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDeliverable()}
            placeholder="Add a deliverable…"
            className="flex-1 border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={addDeliverable}
            disabled={!newDeliverable.trim()}
            className="bg-primary text-white text-sm px-3 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      {/* Files & Links */}
      <div className="bg-white border border-border p-5">
        <h2 className="font-medium text-dark mb-4">Files & Links</h2>

        {links.length === 0 && (
          <p className="text-sm text-muted mb-4">No links yet. Paste a URL to add one.</p>
        )}

        <ul className="flex flex-col gap-2 mb-4">
          {links.map((l) => (
            <li key={l.id} className="flex items-center gap-3 group">
              <div className="w-5 h-5 bg-teal-tint text-primary flex items-center justify-center shrink-0 text-[10px]">
                ↗
              </div>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex-1 truncate"
              >
                {l.label}
              </a>
              <button
                onClick={() => deleteLink(l.id)}
                className="text-xs text-muted hover:text-accent transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={newLinkLabel}
            onChange={(e) => setNewLinkLabel(e.target.value)}
            placeholder="Label (optional)"
            className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
          />
          <div className="flex gap-2">
            <input
              type="url"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLink()}
              placeholder="https://…"
              className="flex-1 border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={addLink}
              disabled={!newLinkUrl.trim()}
              className="bg-primary text-white text-sm px-3 py-2 hover:bg-primary-hover transition-colors disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
