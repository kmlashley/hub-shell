"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fmtDate } from "@/lib/fmt-date";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
  company: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "paused" | "completed" | "archived";
  client_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  clients: Client | null;
}

type StatusFilter = "all" | "active" | "paused" | "completed" | "archived";

type FormData = {
  name: string;
  description: string | null;
  status: Project["status"];
  client_id: string | null;
  start_date: string | null;
  end_date: string | null;
};

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  active: "bg-teal-tint text-primary",
  paused: "bg-gold-tint text-gold",
  completed: "bg-purple-tint text-purple",
  archived: "bg-border text-muted",
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  async function load() {
    setLoading(true);
    const [projectsRes, clientsRes] = await Promise.all([
      fetch("/api/projects"),
      fetch("/api/clients"),
    ]);
    if (projectsRes.ok) setProjects((await projectsRes.json()).projects ?? []);
    if (clientsRes.ok) setClients((await clientsRes.json()).clients ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(data: FormData) {
    if (editing) {
      await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...data }),
      });
    } else {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setShowForm(false);
    setEditing(null);
    await load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this project?")) return;
    await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
    await load();
  }

  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);

  const counts: Record<StatusFilter, number> = {
    all: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    paused: projects.filter((p) => p.status === "paused").length,
    completed: projects.filter((p) => p.status === "completed").length,
    archived: projects.filter((p) => p.status === "archived").length,
  };

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <span className="text-dark">Projects</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">Projects</h1>
          <p className="text-sm text-muted">All client and personal projects in one place.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors shrink-0"
        >
          + Add project
        </button>
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {(["all", "active", "paused", "completed", "archived"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium border transition-colors capitalize ${
              filter === s
                ? "bg-primary text-white border-primary"
                : "bg-white border-border text-dark hover:border-primary/30"
            }`}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Project list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center">
          <p className="text-base font-serif text-dark mb-1">
            {filter === "all" ? "No projects yet" : `No ${filter} projects`}
          </p>
          {filter === "all" && (
            <>
              <p className="text-sm text-muted mb-5">Add your first project to get started.</p>
              <button
                onClick={() => { setEditing(null); setShowForm(true); }}
                className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors"
              >
                Add your first project
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white border border-border divide-y divide-border">
          {filtered.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              onEdit={() => { setEditing(project); setShowForm(true); }}
              onDelete={() => handleDelete(project.id)}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <ProjectForm
          initial={editing}
          clients={clients}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ─── Project row ───────────────────────────────────────────────────────────────

function ProjectRow({
  project,
  onEdit,
  onDelete,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const clientLabel = project.clients
    ? project.clients.name + (project.clients.company ? ` · ${project.clients.company}` : "")
    : "Personal";

  const detailHref = project.client_id
    ? `/clients/${project.client_id}/projects/${project.id}`
    : `/projects/${project.id}`;

  return (
    <div className="flex items-center gap-4 px-5 py-4 group hover:bg-light transition-colors">
      <span
        className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 capitalize shrink-0 ${STATUS_BADGE[project.status] ?? "bg-border text-muted"}`}
      >
        {project.status}
      </span>

      <div className="flex-1 min-w-0">
        <Link
          href={detailHref}
          className="text-sm font-medium text-dark hover:text-primary transition-colors"
        >
          {project.name}
        </Link>
        <p className="text-xs text-muted mt-0.5">{clientLabel}</p>
      </div>

      {project.end_date && (
        <span className="text-xs text-muted shrink-0">Due {fmtDate(project.end_date)}</span>
      )}

      <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Link href={detailHref} className="text-xs text-primary hover:underline">
          View →
        </Link>
        <button onClick={onEdit} className="text-xs text-muted hover:text-dark transition-colors">
          Edit
        </button>
        <button onClick={onDelete} className="text-xs text-muted hover:text-accent transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Project form modal ────────────────────────────────────────────────────────

function ProjectForm({
  initial,
  clients,
  onSave,
  onClose,
}: {
  initial: Project | null;
  clients: Client[];
  onSave: (data: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<Project["status"]>(initial?.status ?? "active");
  const [clientId, setClientId] = useState(initial?.client_id ?? "");
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [saving, setSaving] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    await onSave({
      name: name.trim(),
      description: description.trim() || null,
      status,
      client_id: clientId || null,
      start_date: startDate || null,
      end_date: endDate || null,
    });
    setSaving(false);
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-dark/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white border border-border w-full max-w-md shadow-3">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-serif text-dark">{initial ? "Edit project" : "Add project"}</h2>
          <button onClick={onClose} className="text-muted hover:text-dark transition-colors text-2xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={submit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              Name <span className="text-accent">*</span>
            </label>
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
            <label className="block text-sm font-medium text-dark mb-1.5">
              Description <span className="text-muted font-normal text-xs">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What is this project about?"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Project["status"])}
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">
                Client <span className="text-muted font-normal text-xs">(optional)</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              >
                <option value="">Personal / no client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.company ? ` · ${c.company}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Due date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 bg-primary text-white text-sm font-medium py-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : initial ? "Save changes" : "Add project"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border text-sm text-muted hover:text-dark hover:border-dark/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
