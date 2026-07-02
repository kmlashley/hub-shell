"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { fmtDate, fmtRelative } from "@/lib/fmt-date";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  status: "active" | "paused" | "closed";
  notes: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  client_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface ClientNote {
  id: string;
  client_id: string;
  content: string;
  created_at: string;
}

type Tab = "overview" | "projects" | "notes" | "history";

// ─── Status config ─────────────────────────────────────────────────────────────

const CLIENT_STATUS: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-teal-tint text-primary" },
  paused: { label: "Paused", className: "bg-gold-tint text-gold" },
  closed: { label: "Closed", className: "bg-border text-muted" },
};

const PROJECT_STATUS: Record<string, string> = {
  active: "bg-teal-tint text-primary",
  paused: "bg-gold-tint text-gold",
  completed: "bg-purple-tint text-purple",
  archived: "bg-border text-muted",
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  async function load() {
    setLoading(true);
    const [clientRes, projectsRes, notesRes] = await Promise.all([
      fetch(`/api/clients/${id}`),
      fetch(`/api/projects?client_id=${id}`),
      fetch(`/api/clients/${id}/notes`),
    ]);
    if (clientRes.ok) setClient((await clientRes.json()).client);
    if (projectsRes.ok) setProjects((await projectsRes.json()).projects ?? []);
    if (notesRes.ok) setClientNotes((await notesRes.json()).notes ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function saveNote() {
    if (!noteDraft.trim() || savingNote) return;
    setSavingNote(true);
    await fetch(`/api/clients/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteDraft }),
    });
    setNoteDraft("");
    const res = await fetch(`/api/clients/${id}/notes`);
    if (res.ok) setClientNotes((await res.json()).notes ?? []);
    setSavingNote(false);
  }

  async function deleteNote(noteId: string) {
    if (!window.confirm("Delete this note?")) return;
    await fetch(`/api/clients/${id}/notes?noteId=${noteId}`, { method: "DELETE" });
    setClientNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="h-32 bg-white border border-border animate-pulse mb-6" />
        <div className="h-96 bg-white border border-border animate-pulse" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-sm text-muted">Client not found.</p>
        <Link href="/clients" className="text-sm text-primary mt-2 inline-block hover:underline">
          ← Back to clients
        </Link>
      </div>
    );
  }

  const status = CLIENT_STATUS[client.status] ?? CLIENT_STATUS.active;
  const activeProjects = projects.filter((p) => p.status === "active");
  const initials = client.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "projects", label: "Projects", count: projects.length },
    { key: "notes", label: "Notes", count: clientNotes.length },
    { key: "history", label: "History" },
  ];

  return (
    <div className="max-w-4xl mx-auto">

      {/* Breadcrumb */}
      <p className="text-xs text-muted mb-6">
        <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
        {" › "}
        <Link href="/clients" className="hover:text-dark transition-colors">Clients</Link>
        {" › "}
        <span className="text-dark">{client.name}</span>
      </p>

      {/* Header card */}
      <div className="bg-white border border-border p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 bg-teal-tint text-primary font-bold text-lg flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-serif text-dark">{client.name}</h1>
              <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${status.className}`}>
                {status.label}
              </span>
            </div>
            {client.company && (
              <p className="text-sm text-muted">{client.company}</p>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`} className="text-sm text-primary hover:underline mt-0.5 inline-block">
                {client.email}
              </a>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted">Client since</p>
            <p className="text-sm text-dark font-medium">{fmtDate(client.created_at)}</p>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="flex gap-8 mt-5 pt-5 border-t border-border">
          <div>
            <p className="text-2xl font-bold text-dark">{projects.length}</p>
            <p className="text-xs text-muted">Total projects</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{activeProjects.length}</p>
            <p className="text-xs text-muted">Active</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent">{clientNotes.length}</p>
            <p className="text-xs text-muted">Notes</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-dark"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 ${tab === t.key ? "bg-teal-tint text-primary" : "bg-border text-muted"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <OverviewTab client={client} projects={projects} />
      )}
      {tab === "projects" && (
        <ProjectsTab clientId={id} projects={projects} onRefresh={load} />
      )}
      {tab === "notes" && (
        <NotesTab
          notes={clientNotes}
          draft={noteDraft}
          saving={savingNote}
          onDraftChange={setNoteDraft}
          onSave={saveNote}
          onDelete={deleteNote}
        />
      )}
      {tab === "history" && (
        <HistoryTab client={client} projects={projects} notes={clientNotes} />
      )}
    </div>
  );
}

// ─── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ client, projects }: { client: Client; projects: Project[] }) {
  const active = projects.filter((p) => p.status === "active");
  const upcoming = projects
    .filter((p) => p.end_date && new Date(p.end_date) > new Date())
    .sort((a, b) => (a.end_date ?? "").localeCompare(b.end_date ?? ""))
    .slice(0, 3);

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Current deliverables */}
      <div className="bg-white border border-border p-5">
        <h3 className="font-medium text-dark mb-4">Active Projects</h3>
        {active.length === 0 ? (
          <p className="text-sm text-muted">No active projects.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {active.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/clients/${client.id}/projects/${p.id}`}
                  className="flex items-center justify-between group"
                >
                  <span className="text-sm text-dark group-hover:text-primary transition-colors">
                    {p.name}
                  </span>
                  {p.end_date && (
                    <span className="text-xs text-muted">Due {fmtDate(p.end_date)}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Upcoming dates */}
      <div className="bg-white border border-border p-5">
        <h3 className="font-medium text-dark mb-4">Upcoming Dates</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">No upcoming deadlines.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcoming.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span className="text-sm text-dark">{p.name}</span>
                <span className="text-xs font-medium text-accent">{fmtDate(p.end_date!)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Notes summary */}
      {client.notes && (
        <div className="bg-white border border-border p-5 col-span-2">
          <h3 className="font-medium text-dark mb-2">Client Notes</h3>
          <p className="text-sm text-dark/80 whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Projects tab ──────────────────────────────────────────────────────────────

function ProjectsTab({
  clientId,
  projects,
  onRefresh,
}: {
  clientId: string;
  projects: Project[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function addProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        status,
        client_id: clientId,
        start_date: startDate || null,
        end_date: endDate || null,
      }),
    });
    setName(""); setStartDate(""); setEndDate(""); setStatus("active");
    setShowForm(false);
    setSaving(false);
    onRefresh();
  }

  async function deleteProject(id: string) {
    if (!window.confirm("Delete this project?")) return;
    await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-white text-xs font-medium px-3 py-1.5 hover:bg-primary-hover transition-colors"
        >
          + Add project
        </button>
      </div>

      {showForm && (
        <form onSubmit={addProject} className="bg-white border border-border p-4 mb-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-dark mb-1">Project name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                placeholder="Brand strategy refresh"
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
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
              <label className="block text-xs font-medium text-dark mb-1">End / due date</label>
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
              {saving ? "Saving…" : "Add project"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 border border-border text-sm text-muted hover:text-dark transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {projects.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted">No projects yet for this client.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((p) => (
            <div key={p.id} className="bg-white border border-border p-4 flex items-center justify-between group hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-4">
                <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 capitalize ${PROJECT_STATUS[p.status] ?? "bg-border text-muted"}`}>
                  {p.status}
                </span>
                <Link
                  href={`/clients/${clientId}/projects/${p.id}`}
                  className="text-sm font-medium text-dark hover:text-primary transition-colors"
                >
                  {p.name}
                </Link>
              </div>
              <div className="flex items-center gap-6">
                {p.end_date && (
                  <span className="text-xs text-muted">Due {fmtDate(p.end_date)}</span>
                )}
                <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/clients/${clientId}/projects/${p.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    View →
                  </Link>
                  <button
                    onClick={() => deleteProject(p.id)}
                    className="text-xs text-muted hover:text-accent transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Notes tab ─────────────────────────────────────────────────────────────────

function NotesTab({
  notes,
  draft,
  saving,
  onDraftChange,
  onSave,
  onDelete,
}: {
  notes: ClientNote[];
  draft: string;
  saving: boolean;
  onDraftChange: (v: string) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div className="bg-white border border-border p-4 mb-4">
        <textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.metaKey && onSave()}
          placeholder="Add a note about this client… (⌘+Enter to save)"
          rows={3}
          className="w-full text-sm border-0 outline-none resize-none text-dark placeholder:text-muted"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={onSave}
            disabled={saving || !draft.trim()}
            className="px-4 py-1.5 bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-40 transition-colors"
          >
            {saving ? "Saving…" : "Save note"}
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">No notes yet for this client.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <div key={note.id} className="bg-white border border-border p-4 group">
              <p className="text-sm text-dark/90 whitespace-pre-wrap">{note.content}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted">{fmtRelative(note.created_at)}</p>
                <button
                  onClick={() => onDelete(note.id)}
                  className="text-xs text-muted hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── History tab ───────────────────────────────────────────────────────────────

function HistoryTab({
  client,
  projects,
  notes,
}: {
  client: Client;
  projects: Project[];
  notes: ClientNote[];
}) {
  type HistoryItemType = "project" | "note" | "client";
  type HistoryItem = { date: string; label: string; type: HistoryItemType };

  const items: HistoryItem[] = ([] as HistoryItem[])
    .concat([{ date: client.created_at, label: "Client added", type: "client" }])
    .concat(projects.map((p) => ({ date: p.created_at, label: `Project added: ${p.name}`, type: "project" as HistoryItemType })))
    .concat(notes.map((n) => ({ date: n.created_at, label: `Note: ${n.content.slice(0, 80)}${n.content.length > 80 ? "…" : ""}`, type: "note" as HistoryItemType })))
    .sort((a, b) => b.date.localeCompare(a.date));

  const TYPE_BADGE: Record<HistoryItem["type"], string> = {
    client: "bg-teal-tint text-primary",
    project: "bg-purple-tint text-purple",
    note: "bg-gold-tint text-gold",
  };

  return (
    <div className="flex flex-col gap-0 border-l-2 border-border ml-4">
      {items.map((item, i) => (
        <div key={i} className="relative pl-6 pb-5">
          <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 bg-border border-2 border-white rounded-full" />
          <div className="flex items-start gap-3">
            <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 shrink-0 ${TYPE_BADGE[item.type]}`}>
              {item.type}
            </span>
            <div>
              <p className="text-sm text-dark">{item.label}</p>
              <p className="text-xs text-muted mt-0.5">{fmtRelative(item.date)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
