"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Funnel {
  id: string;
  name: string;
  created_at: string;
}

interface FunnelStage {
  id: string;
  funnel_id: string;
  name: string;
  position: number;
  source: string | null;
  action: string | null;
  notes: string | null;
}

// Funnel stages narrow as they progress — widths cycle through these steps
const STAGE_WIDTHS = ["100%", "90%", "80%", "70%", "62%", "55%"];

function stageWidth(index: number, total: number): string {
  if (total <= 1) return "100%";
  const step = Math.min(index, STAGE_WIDTHS.length - 1);
  return STAGE_WIDTHS[step];
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FunnelsPage() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFunnelId, setActiveFunnelId] = useState<string | null>(null);
  const [newFunnelName, setNewFunnelName] = useState("");
  const [addingFunnel, setAddingFunnel] = useState(false);
  const [renamingFunnel, setRenamingFunnel] = useState(false);
  const [renameName, setRenameName] = useState("");

  async function loadFunnels() {
    setLoading(true);
    const res = await fetch("/api/sales-marketing/funnels");
    if (res.ok) {
      const data = await res.json();
      const list: Funnel[] = data.funnels ?? [];
      setFunnels(list);
      if (list.length > 0 && !activeFunnelId) {
        setActiveFunnelId(list[0].id);
      }
    }
    setLoading(false);
  }

  useEffect(() => { loadFunnels(); }, []);

  async function createFunnel(e: React.FormEvent) {
    e.preventDefault();
    if (!newFunnelName.trim()) return;
    const res = await fetch("/api/sales-marketing/funnels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFunnelName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setActiveFunnelId(data.funnel.id);
    }
    setNewFunnelName("");
    setAddingFunnel(false);
    await loadFunnels();
  }

  async function renameFunnel(e: React.FormEvent) {
    e.preventDefault();
    if (!renameName.trim() || !activeFunnelId) return;
    await fetch("/api/sales-marketing/funnels", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeFunnelId, name: renameName.trim() }),
    });
    setRenamingFunnel(false);
    await loadFunnels();
  }

  async function deleteFunnel(id: string) {
    if (!window.confirm("Delete this funnel and all its stages?")) return;
    await fetch(`/api/sales-marketing/funnels?id=${id}`, { method: "DELETE" });
    setActiveFunnelId(funnels.find((f) => f.id !== id)?.id ?? null);
    await loadFunnels();
  }

  const activeFunnel = funnels.find((f) => f.id === activeFunnelId) ?? null;

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted mb-2">
          <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
          {" › "}
          <Link href="/sales-marketing" className="hover:text-dark transition-colors">Sales & Marketing</Link>
          {" › "}
          <span className="text-dark">Funnels</span>
        </p>
        <h1 className="text-2xl font-serif text-dark mb-1">Funnels</h1>
        <p className="text-sm text-muted">Map your customer journey from first touch to purchase.</p>
      </div>

      {loading ? (
        <div className="h-64 bg-white border border-border animate-pulse" />
      ) : funnels.length === 0 && !addingFunnel ? (
        <div className="border border-dashed border-border p-16 text-center">
          <p className="text-base font-serif text-dark mb-1">No funnels yet</p>
          <p className="text-sm text-muted mb-5">Create your first funnel to map a customer journey.</p>
          <button
            onClick={() => setAddingFunnel(true)}
            className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors"
          >
            Create your first funnel
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* Funnel selector */}
          <div className="flex items-center gap-3 flex-wrap">
            {funnels.map((f) => (
              <button
                key={f.id}
                onClick={() => { setActiveFunnelId(f.id); setRenamingFunnel(false); }}
                className={`px-4 py-2 text-sm font-medium border transition-colors ${
                  activeFunnelId === f.id
                    ? "bg-primary text-white border-primary"
                    : "bg-white border-border text-dark hover:border-primary/30"
                }`}
              >
                {f.name}
              </button>
            ))}
            {addingFunnel ? (
              <form onSubmit={createFunnel} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFunnelName}
                  onChange={(e) => setNewFunnelName(e.target.value)}
                  placeholder="Funnel name…"
                  autoFocus
                  className="border border-border bg-white px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors w-44"
                />
                <button
                  type="submit"
                  disabled={!newFunnelName.trim()}
                  className="bg-primary text-white text-xs font-medium px-3 py-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingFunnel(false); setNewFunnelName(""); }}
                  className="text-xs text-muted hover:text-dark transition-colors"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => setAddingFunnel(true)}
                className="px-4 py-2 text-sm border border-dashed border-border text-muted hover:text-dark hover:border-border-2 transition-colors"
              >
                + New funnel
              </button>
            )}
          </div>

          {/* Active funnel */}
          {activeFunnel && (
            <div className="flex flex-col gap-0">

              {/* Funnel header */}
              <div className="flex items-center justify-between mb-5">
                {renamingFunnel ? (
                  <form onSubmit={renameFunnel} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={renameName}
                      onChange={(e) => setRenameName(e.target.value)}
                      autoFocus
                      className="border border-border bg-white px-3 py-1.5 text-sm text-dark focus:outline-none focus:border-primary transition-colors w-52"
                    />
                    <button
                      type="submit"
                      disabled={!renameName.trim()}
                      className="bg-primary text-white text-xs px-3 py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingFunnel(false)}
                      className="text-xs text-muted hover:text-dark transition-colors"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <h2 className="font-serif text-dark text-lg">{activeFunnel.name}</h2>
                )}
                {!renamingFunnel && (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => { setRenameName(activeFunnel.name); setRenamingFunnel(true); }}
                      className="text-xs text-muted hover:text-dark transition-colors"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => deleteFunnel(activeFunnel.id)}
                      className="text-xs text-muted hover:text-accent transition-colors"
                    >
                      Delete funnel
                    </button>
                  </div>
                )}
              </div>

              {/* Stage diagram */}
              <FunnelDiagram
                funnelId={activeFunnel.id}
              />

            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Funnel diagram ────────────────────────────────────────────────────────────

function FunnelDiagram({ funnelId }: { funnelId: string }) {
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  async function loadStages() {
    setLoading(true);
    const res = await fetch(`/api/sales-marketing/funnel-stages?funnel_id=${funnelId}`);
    if (res.ok) {
      const data = await res.json();
      setStages(data.stages ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    setStages([]);
    setEditingId(null);
    setShowAddForm(false);
    loadStages();
  }, [funnelId]);

  async function handleAddStage(data: Omit<FunnelStage, "id" | "funnel_id" | "position">) {
    await fetch("/api/sales-marketing/funnel-stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ funnel_id: funnelId, ...data }),
    });
    setShowAddForm(false);
    await loadStages();
  }

  async function handleUpdateStage(id: string, data: Partial<FunnelStage>) {
    await fetch("/api/sales-marketing/funnel-stages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    setEditingId(null);
    await loadStages();
  }

  async function handleDeleteStage(id: string) {
    if (!window.confirm("Remove this stage?")) return;
    await fetch(`/api/sales-marketing/funnel-stages?id=${id}`, { method: "DELETE" });
    await loadStages();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-1">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 bg-white border border-border animate-pulse"
            style={{ width: stageWidth(i, 3) }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0">

      {stages.length === 0 && !showAddForm ? (
        <div className="border border-dashed border-border p-10 text-center w-full">
          <p className="text-sm text-muted mb-3">No stages yet. Add your first stage to build the funnel.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-primary text-white text-xs font-medium px-4 py-2 hover:bg-primary-hover transition-colors"
          >
            + Add first stage
          </button>
        </div>
      ) : (
        <>
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex flex-col items-center w-full">
              {editingId === stage.id ? (
                <div style={{ width: stageWidth(index, stages.length) }}>
                  <StageEditForm
                    stage={stage}
                    onSave={(data) => handleUpdateStage(stage.id, { ...data, position: stage.position })}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div
                  className="bg-white border border-border group relative transition-all hover:border-primary/40"
                  style={{ width: stageWidth(index, stages.length) }}
                >
                  {/* Stage number */}
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 bg-primary text-white text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </div>

                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-dark text-sm">{stage.name}</p>
                      <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                        <button
                          onClick={() => setEditingId(stage.id)}
                          className="text-xs text-muted hover:text-dark transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteStage(stage.id)}
                          className="text-xs text-muted hover:text-accent transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {stage.source && (
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Entry source</span>
                          <p className="text-xs text-dark mt-0.5">{stage.source}</p>
                        </div>
                      )}
                      {stage.action && (
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Conversion action</span>
                          <p className="text-xs text-dark mt-0.5">{stage.action}</p>
                        </div>
                      )}
                    </div>

                    {stage.notes && (
                      <p className="text-xs text-muted mt-2 pt-2 border-t border-border leading-relaxed">
                        {stage.notes}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Arrow between stages */}
              {index < stages.length - 1 && (
                <div className="flex flex-col items-center py-0.5">
                  <div className="w-px h-4 bg-border" />
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                    <path d="M1 1l5 6 5-6" stroke="#e3dccf" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}

          {/* Add stage */}
          <div className="mt-4 w-full flex flex-col items-center gap-3">
            {stages.length > 0 && (
              <div className="flex flex-col items-center">
                <div className="w-px h-4 bg-border" />
              </div>
            )}
            {showAddForm ? (
              <div className="w-full">
                <StageEditForm
                  stage={null}
                  onSave={handleAddStage}
                  onCancel={() => setShowAddForm(false)}
                />
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="border border-dashed border-border px-6 py-3 text-sm text-muted hover:text-primary hover:border-primary/40 transition-colors w-full"
              >
                + Add stage
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Stage edit form ───────────────────────────────────────────────────────────

function StageEditForm({
  stage,
  onSave,
  onCancel,
}: {
  stage: FunnelStage | null;
  onSave: (data: Omit<FunnelStage, "id" | "funnel_id" | "position">) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(stage?.name ?? "");
  const [source, setSource] = useState(stage?.source ?? "");
  const [action, setAction] = useState(stage?.action ?? "");
  const [notes, setNotes] = useState(stage?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    await onSave({
      name: name.trim(),
      source: source.trim() || null,
      action: action.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
  }

  return (
    <form
      onSubmit={submit}
      className="bg-light border border-primary/30 p-4 flex flex-col gap-3"
    >
      <div>
        <label className="block text-xs font-medium text-dark mb-1">
          Stage name <span className="text-accent">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder="e.g. Awareness, Lead Magnet, Sales Page"
          className="w-full border border-border bg-white px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-dark mb-1">
            Entry source <span className="text-muted font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. Instagram, Google Ad"
            className="w-full border border-border bg-white px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-dark mb-1">
            Conversion action <span className="text-muted font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g. Email opt-in, Checkout"
            className="w-full border border-border bg-white px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-dark mb-1">
          Notes <span className="text-muted font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What's working at this stage, drop-off observations…"
          rows={2}
          className="w-full border border-border bg-white px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors resize-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="bg-primary text-white text-xs font-medium px-4 py-1.5 hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : stage ? "Save changes" : "Add stage"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 border border-border text-xs text-muted hover:text-dark transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
