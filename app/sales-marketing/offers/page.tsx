"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Offer {
  id: string;
  name: string;
  price: number;
  status: "active" | "paused" | "coming_soon";
  type: "product" | "service" | "membership";
  description: string | null;
  url: string | null;
  created_at: string;
}

type FormData = Omit<Offer, "id" | "created_at">;

// ─── Config ────────────────────────────────────────────────────────────────────

const STATUS: Record<Offer["status"], { label: string; className: string }> = {
  active: { label: "Active", className: "bg-teal-tint text-primary" },
  paused: { label: "Paused", className: "bg-gold-tint text-gold" },
  coming_soon: { label: "Coming Soon", className: "bg-purple-tint text-purple" },
};

const TYPE: Record<Offer["type"], { label: string; className: string }> = {
  product: { label: "Product", className: "bg-border text-muted" },
  service: { label: "Service", className: "bg-rust-tint text-accent" },
  membership: { label: "Membership", className: "bg-olive-tint text-olive" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

const BLANK: FormData = {
  name: "",
  price: 0,
  status: "active",
  type: "product",
  description: null,
  url: null,
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Offer["status"] | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/sales-marketing/offers");
    if (res.ok) {
      const data = await res.json();
      setOffers(data.offers ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(data: FormData) {
    if (editing) {
      await fetch("/api/sales-marketing/offers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...data }),
      });
    } else {
      await fetch("/api/sales-marketing/offers", {
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
    if (!window.confirm("Delete this offer? This cannot be undone.")) return;
    await fetch(`/api/sales-marketing/offers?id=${id}`, { method: "DELETE" });
    await load();
  }

  const filtered = filter === "all" ? offers : offers.filter((o) => o.status === filter);

  const counts = {
    all: offers.length,
    active: offers.filter((o) => o.status === "active").length,
    paused: offers.filter((o) => o.status === "paused").length,
    coming_soon: offers.filter((o) => o.status === "coming_soon").length,
  };

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <Link href="/sales-marketing" className="hover:text-dark transition-colors">Sales & Marketing</Link>
            {" › "}
            <span className="text-dark">Offers</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">Offers</h1>
          <p className="text-sm text-muted">Your full offer portfolio — what you sell, at what price, and current status.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors shrink-0"
        >
          + Add offer
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        {(["all", "active", "paused", "coming_soon"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
              filter === s
                ? "bg-primary text-white border-primary"
                : "bg-white border-border text-dark hover:border-primary/30"
            }`}
          >
            {s === "all" ? "All" : STATUS[s]?.label ?? s} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-52 bg-white border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center">
          <p className="text-base font-serif text-dark mb-1">
            {filter === "all" ? "No offers yet" : `No ${STATUS[filter as Offer["status"]]?.label.toLowerCase()} offers`}
          </p>
          {filter === "all" && (
            <>
              <p className="text-sm text-muted mb-5">Add your first offer to track your portfolio.</p>
              <button
                onClick={() => { setEditing(null); setShowForm(true); }}
                className="bg-primary text-white text-sm px-5 py-2 hover:bg-primary-hover transition-colors"
              >
                Add your first offer
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onEdit={() => { setEditing(offer); setShowForm(true); }}
              onDelete={() => handleDelete(offer.id)}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <OfferForm
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

    </div>
  );
}

// ─── Offer card ────────────────────────────────────────────────────────────────

function OfferCard({
  offer,
  onEdit,
  onDelete,
}: {
  offer: Offer;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = STATUS[offer.status];
  const type = TYPE[offer.type];

  return (
    <div className="bg-white border border-border p-5 group flex flex-col hover:border-primary/30 transition-colors">

      {/* Status + type badges */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${status.className}`}>
          {status.label}
        </span>
        <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 ${type.className}`}>
          {type.label}
        </span>
      </div>

      {/* Name + price */}
      <div className="flex-1 mb-4">
        <p className="font-medium text-dark leading-snug mb-1">{offer.name}</p>
        <p className="text-2xl font-bold text-primary">{fmt(offer.price)}</p>
        {offer.description && (
          <p className="text-xs text-muted mt-2 leading-relaxed line-clamp-2">{offer.description}</p>
        )}
      </div>

      {/* URL */}
      {offer.url && (
        <a
          href={offer.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline truncate block mb-4"
        >
          {offer.url}
        </a>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="text-xs text-muted hover:text-dark transition-colors">
            Edit
          </button>
          <button onClick={onDelete} className="text-xs text-muted hover:text-accent transition-colors">
            Delete
          </button>
        </div>
        <Link
          href={`/sales-marketing/revenue?stream=products`}
          className="text-xs text-muted hover:text-primary transition-colors ml-auto"
        >
          Revenue →
        </Link>
      </div>
    </div>
  );
}

// ─── Offer form modal ──────────────────────────────────────────────────────────

function OfferForm({
  initial,
  onSave,
  onClose,
}: {
  initial: Offer | null;
  onSave: (data: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [status, setStatus] = useState<Offer["status"]>(initial?.status ?? "active");
  const [type, setType] = useState<Offer["type"]>(initial?.type ?? "product");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
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
      price: parseFloat(price) || 0,
      status,
      type,
      description: description.trim() || null,
      url: url.trim() || null,
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
          <h2 className="font-serif text-dark">{initial ? "Edit offer" : "Add offer"}</h2>
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
              placeholder="e.g. 1:1 Coaching, Content OS Course"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Price ($)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
                step="1"
                placeholder="0"
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Offer["type"])}
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              >
                <option value="product">Product</option>
                <option value="service">Service</option>
                <option value="membership">Membership</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Offer["status"])}
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="coming_soon">Coming Soon</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              Description <span className="text-muted font-normal text-xs">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's included, who it's for…"
              rows={3}
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">
              URL <span className="text-muted font-normal text-xs">(optional)</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 bg-primary text-white text-sm font-medium py-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : initial ? "Save changes" : "Add offer"}
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
