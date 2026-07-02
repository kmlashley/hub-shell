"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Sequence {
  id: string;
  name: string;
  trigger: string | null;
  status: "active" | "paused" | "draft";
  notes: string | null;
  email_count: number;
  created_at: string;
}

interface SequenceEmail {
  id: string;
  sequence_id: string;
  position: number;
  subject: string;
  status: "active" | "paused" | "draft";
}

// ─── Config ────────────────────────────────────────────────────────────────────

const SEQ_STATUS: Record<Sequence["status"], { label: string; className: string }> = {
  active: { label: "Active", className: "bg-teal-tint text-primary" },
  paused: { label: "Paused", className: "bg-gold-tint text-gold" },
  draft: { label: "Draft", className: "bg-border text-muted" },
};

const EMAIL_STATUS: Record<SequenceEmail["status"], { label: string; className: string }> = {
  active: { label: "Active", className: "bg-teal-tint text-primary" },
  paused: { label: "Paused", className: "bg-gold-tint text-gold" },
  draft: { label: "Draft", className: "bg-border text-muted" },
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function EmailSequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Sequence | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    const res = await fetch("/api/sales-marketing/email-sequences");
    if (res.ok) {
      const data = await res.json();
      setSequences(data.sequences ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(data: Omit<Sequence, "id" | "email_count" | "created_at">) {
    if (editing) {
      await fetch("/api/sales-marketing/email-sequences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...data }),
      });
    } else {
      await fetch("/api/sales-marketing/email-sequences", {
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
    if (!window.confirm("Delete this sequence and all its emails?")) return;
    await fetch(`/api/sales-marketing/email-sequences?id=${id}`, { method: "DELETE" });
    setExpanded((prev) => { const next = new Set(prev); next.delete(id); return next; });
    await load();
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <Link href="/sales-marketing" className="hover:text-dark transition-colors">Sales & Marketing</Link>
            {" › "}
            <span className="text-dark">Email Sequences</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">Email Sequences</h1>
          <p className="text-sm text-muted">Track your sequences, email by email — triggers, subject lines, and notes on what's working.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors shrink-0"
        >
          + Add sequence
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : sequences.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center">
          <p className="text-base font-serif text-dark mb-1">No sequences yet</p>
          <p className="text-sm text-muted mb-5">Add your first email sequence to get started.</p>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors"
          >
            Add your first sequence
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sequences.map((seq) => (
            <SequenceRow
              key={seq.id}
              sequence={seq}
              isExpanded={expanded.has(seq.id)}
              onToggle={() => toggleExpand(seq.id)}
              onEdit={() => { setEditing(seq); setShowForm(true); }}
              onDelete={() => handleDelete(seq.id)}
              onEmailChange={load}
            />
          ))}
        </div>
      )}

      {/* Sequence form */}
      {showForm && (
        <SequenceForm
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

    </div>
  );
}

// ─── Sequence row ──────────────────────────────────────────────────────────────

function SequenceRow({
  sequence,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onEmailChange,
}: {
  sequence: Sequence;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEmailChange: () => void;
}) {
  const [emails, setEmails] = useState<SequenceEmail[]>([]);
  const [emailsLoaded, setEmailsLoaded] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [editingEmail, setEditingEmail] = useState<SequenceEmail | null>(null);

  const status = SEQ_STATUS[sequence.status];

  async function loadEmails() {
    const res = await fetch(`/api/sales-marketing/sequence-emails?sequence_id=${sequence.id}`);
    if (res.ok) {
      const data = await res.json();
      setEmails(data.emails ?? []);
    }
    setEmailsLoaded(true);
  }

  async function handleToggle() {
    onToggle();
    if (!emailsLoaded) await loadEmails();
  }

  async function handleSaveEmail(data: { subject: string; status: SequenceEmail["status"] }) {
    if (editingEmail) {
      await fetch("/api/sales-marketing/sequence-emails", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingEmail.id, position: editingEmail.position, ...data }),
      });
    } else {
      await fetch("/api/sales-marketing/sequence-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequence_id: sequence.id, ...data }),
      });
    }
    setShowEmailForm(false);
    setEditingEmail(null);
    await loadEmails();
    onEmailChange();
  }

  async function handleDeleteEmail(id: string) {
    if (!window.confirm("Remove this email from the sequence?")) return;
    await fetch(`/api/sales-marketing/sequence-emails?id=${id}`, { method: "DELETE" });
    await loadEmails();
    onEmailChange();
  }

  return (
    <div className="bg-white border border-border">

      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4 group">
        <button
          onClick={handleToggle}
          className="text-muted hover:text-dark transition-colors shrink-0"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 12 12"
            fill="none"
            className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 shrink-0 ${status.className}`}>
          {status.label}
        </span>

        <button onClick={handleToggle} className="flex-1 text-left min-w-0">
          <p className="font-medium text-dark text-sm">{sequence.name}</p>
          {sequence.trigger && (
            <p className="text-xs text-muted mt-0.5">Trigger: {sequence.trigger}</p>
          )}
        </button>

        <span className="text-xs text-muted shrink-0">
          {sequence.email_count} {sequence.email_count === 1 ? "email" : "emails"}
        </span>

        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="text-xs text-muted hover:text-dark transition-colors">
            Edit
          </button>
          <button onClick={onDelete} className="text-xs text-muted hover:text-accent transition-colors">
            Delete
          </button>
        </div>
      </div>

      {/* Expanded view */}
      {isExpanded && (
        <div className="border-t border-border">

          {/* Emails */}
          {emails.length === 0 && emailsLoaded ? (
            <p className="text-sm text-muted px-8 py-4">No emails in this sequence yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {emails.map((email) => {
                const es = EMAIL_STATUS[email.status];
                return (
                  <div key={email.id} className="flex items-center gap-4 pl-14 pr-5 py-3 group/email hover:bg-light transition-colors">
                    <span className="text-xs font-bold text-muted w-5 shrink-0 text-center">
                      {email.position}
                    </span>
                    <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 shrink-0 ${es.className}`}>
                      {es.label}
                    </span>
                    <p className="text-sm text-dark flex-1 min-w-0 truncate">{email.subject}</p>
                    <div className="flex gap-3 opacity-0 group-hover/email:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => { setEditingEmail(email); setShowEmailForm(true); }}
                        className="text-xs text-muted hover:text-dark transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEmail(email.id)}
                        className="text-xs text-muted hover:text-accent transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Notes + add email */}
          <div className="px-8 py-4 bg-light border-t border-border flex items-start justify-between gap-6">
            {sequence.notes ? (
              <p className="text-xs text-muted leading-relaxed flex-1">
                <span className="font-semibold text-dark">Notes: </span>
                {sequence.notes}
              </p>
            ) : (
              <span />
            )}
            <button
              onClick={() => { setEditingEmail(null); setShowEmailForm(true); }}
              className="text-xs font-medium text-primary hover:underline shrink-0"
            >
              + Add email
            </button>
          </div>

        </div>
      )}

      {/* Email form */}
      {showEmailForm && (
        <EmailForm
          initial={editingEmail}
          onSave={handleSaveEmail}
          onClose={() => { setShowEmailForm(false); setEditingEmail(null); }}
        />
      )}

    </div>
  );
}

// ─── Sequence form modal ───────────────────────────────────────────────────────

function SequenceForm({
  initial,
  onSave,
  onClose,
}: {
  initial: Sequence | null;
  onSave: (data: Omit<Sequence, "id" | "email_count" | "created_at">) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [trigger, setTrigger] = useState(initial?.trigger ?? "");
  const [status, setStatus] = useState<Sequence["status"]>(initial?.status ?? "active");
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
      trigger: trigger.trim() || null,
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
          <h2 className="font-serif text-dark">{initial ? "Edit sequence" : "Add sequence"}</h2>
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
              placeholder="e.g. Welcome Sequence, Post-Purchase"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              Trigger <span className="text-muted font-normal text-xs">(optional)</span>
            </label>
            <input
              type="text"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="e.g. New subscriber, Purchase of Course X"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Sequence["status"])}
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              Notes <span className="text-muted font-normal text-xs">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What's working, what to improve…"
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
              {saving ? "Saving…" : initial ? "Save changes" : "Add sequence"}
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

// ─── Email form modal ──────────────────────────────────────────────────────────

function EmailForm({
  initial,
  onSave,
  onClose,
}: {
  initial: SequenceEmail | null;
  onSave: (data: { subject: string; status: SequenceEmail["status"] }) => Promise<void>;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [status, setStatus] = useState<SequenceEmail["status"]>(initial?.status ?? "active");
  const [saving, setSaving] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || saving) return;
    setSaving(true);
    await onSave({ subject: subject.trim(), status });
    setSaving(false);
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-dark/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white border border-border w-full max-w-sm shadow-3">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-serif text-dark">{initial ? "Edit email" : "Add email"}</h2>
          <button onClick={onClose} className="text-muted hover:text-dark transition-colors text-2xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={submit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              Subject line <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Welcome — here's what's next"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SequenceEmail["status"])}
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !subject.trim()}
              className="flex-1 bg-primary text-white text-sm font-medium py-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : initial ? "Save changes" : "Add email"}
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
