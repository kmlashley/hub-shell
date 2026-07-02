"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fmtDate } from "@/lib/fmt-date";

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

interface ClientStats {
  total: number;
  active: number;
}

type FormData = Pick<Client, "name" | "company" | "email" | "status" | "notes">;

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<Client["status"], { label: string; className: string }> = {
  active: { label: "Active", className: "bg-teal-tint text-primary" },
  paused: { label: "Paused", className: "bg-gold-tint text-gold" },
  closed: { label: "Closed", className: "bg-border text-muted" },
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Record<string, ClientStats>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Client["status"] | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  async function load() {
    setLoading(true);
    const [clientsRes, statsRes] = await Promise.all([
      fetch("/api/clients"),
      fetch("/api/clients/stats"),
    ]);
    if (clientsRes.ok) {
      const data = await clientsRes.json();
      setClients(data.clients ?? []);
    }
    if (statsRes.ok) {
      const data = await statsRes.json();
      setStats(data.stats ?? {});
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this client? This cannot be undone.")) return;
    await fetch(`/api/clients?id=${id}`, { method: "DELETE" });
    await load();
  }

  async function handleSave(data: FormData) {
    if (editing) {
      await fetch("/api/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...data }),
      });
    } else {
      await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setShowForm(false);
    setEditing(null);
    await load();
  }

  const filtered = filter === "all" ? clients : clients.filter((c) => c.status === filter);

  const counts = {
    all: clients.length,
    active: clients.filter((c) => c.status === "active").length,
    paused: clients.filter((c) => c.status === "paused").length,
    closed: clients.filter((c) => c.status === "closed").length,
  };

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <span className="text-dark">Clients</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">Clients</h1>
          <p className="text-sm text-muted">Track active clients, projects, and key contacts.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors shrink-0"
        >
          + Add client
        </button>
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-2 mb-6">
        {(["all", "active", "paused", "closed"] as const).map((s) => (
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

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center">
          <p className="text-base font-serif text-dark mb-1">
            {filter === "all" ? "No clients yet" : `No ${filter} clients`}
          </p>
          {filter === "all" && (
            <p className="text-sm text-muted mb-5">Add your first client to get started.</p>
          )}
          {filter === "all" && (
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors"
            >
              Add your first client
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              stats={stats[client.id] ?? { total: 0, active: 0 }}
              onEdit={() => { setEditing(client); setShowForm(true); }}
              onDelete={() => handleDelete(client.id)}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <ClientForm
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ─── Client card ───────────────────────────────────────────────────────────────

function ClientCard({
  client,
  stats,
  onEdit,
  onDelete,
}: {
  client: Client;
  stats: ClientStats;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = STATUS[client.status];
  const initials = client.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="bg-white border border-border p-5 group flex flex-col hover:border-primary/30 transition-colors">

      {/* Avatar + status */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 bg-teal-tint text-primary font-bold text-sm flex items-center justify-center shrink-0">
          {initials}
        </div>
        <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${status.className}`}>
          {status.label}
        </span>
      </div>

      {/* Name + company */}
      <Link href={`/clients/${client.id}`} className="flex-1 block group/link mb-3">
        <p className="font-medium text-dark group-hover/link:text-primary transition-colors leading-snug">
          {client.name}
        </p>
        {client.company && (
          <p className="text-xs text-muted mt-0.5">{client.company}</p>
        )}
        {client.email && (
          <p className="text-xs text-muted mt-0.5">{client.email}</p>
        )}
      </Link>

      {/* Quick stats */}
      <div className="flex gap-4 py-3 border-t border-border mb-3">
        <div>
          <p className="text-lg font-bold text-dark">{stats.total}</p>
          <p className="text-[11px] text-muted">Projects</p>
        </div>
        <div>
          <p className="text-lg font-bold text-accent">{stats.active}</p>
          <p className="text-[11px] text-muted">Active</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[11px] text-muted">Since</p>
          <p className="text-[11px] text-dark">{fmtDate(client.created_at)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="text-xs text-muted hover:text-dark transition-colors">
            Edit
          </button>
          <button onClick={onDelete} className="text-xs text-muted hover:text-accent transition-colors">
            Delete
          </button>
        </div>
        <Link
          href={`/clients/${client.id}`}
          className="text-xs text-primary hover:underline ml-auto"
        >
          View →
        </Link>
      </div>
    </div>
  );
}

// ─── Client form modal ─────────────────────────────────────────────────────────

function ClientForm({
  initial,
  onSave,
  onClose,
}: {
  initial: Client | null;
  onSave: (data: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [status, setStatus] = useState<Client["status"]>(initial?.status ?? "active");
  const [notes, setNotes] = useState(initial?.notes ?? "");
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
      company: company.trim() || null,
      email: email.trim() || null,
      status,
      notes: notes.trim() || null,
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
          <h2 className="font-serif text-dark">{initial ? "Edit client" : "Add client"}</h2>
          <button onClick={onClose} className="text-muted hover:text-dark transition-colors text-2xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={submit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Name <span className="text-accent">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Jane Smith"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Company <span className="text-muted font-normal text-xs">(optional)</span></label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Inc."
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Email <span className="text-muted font-normal text-xs">(optional)</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@acme.com"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Client["status"])}
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Notes <span className="text-muted font-normal text-xs">(optional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key context about this client…"
              rows={3}
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 bg-primary text-white text-sm font-medium py-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : initial ? "Save changes" : "Add client"}
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
