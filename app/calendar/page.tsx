"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CalendarItem {
  id: string;
  title: string;
  platform: string;
  status: "idea" | "drafting" | "ready" | "published";
  scheduled_date: string;
  url: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PLATFORMS = ["newsletter", "youtube", "linkedin", "twitter", "instagram", "blog", "other"];
const PLATFORM_LABELS: Record<string, string> = {
  newsletter: "Newsletter",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  twitter: "Twitter / X",
  instagram: "Instagram",
  blog: "Blog",
  other: "Other",
};
const PLATFORM_DOT: Record<string, string> = {
  newsletter: "bg-primary",
  youtube: "bg-accent",
  linkedin: "bg-navy",
  twitter: "bg-dark",
  instagram: "bg-purple",
  blog: "bg-olive",
  other: "bg-muted",
};

const STATUS_CONFIG: Record<CalendarItem["status"], { label: string; badge: string; dot: string }> = {
  idea: { label: "Idea", badge: "bg-border text-muted", dot: "bg-muted" },
  drafting: { label: "Drafting", badge: "bg-gold-tint text-gold", dot: "bg-gold" },
  ready: { label: "Ready", badge: "bg-teal-tint text-primary", dot: "bg-primary" },
  published: { label: "Published", badge: "bg-olive-tint text-olive", dot: "bg-olive" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateStr(today));
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null);

  async function load(y: number, m: number) {
    setLoading(true);
    const res = await fetch(`/api/calendar?year=${y}&month=${m + 1}`);
    if (res.ok) setItems((await res.json()).items ?? []);
    setLoading(false);
  }

  useEffect(() => { load(year, month); }, [year, month]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  async function handleSave(data: Omit<CalendarItem, "id" | "created_at">) {
    if (editingItem) {
      await fetch("/api/calendar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingItem.id, ...data }),
      });
    } else {
      await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setShowForm(false);
    setEditingItem(null);
    await load(year, month);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this item?")) return;
    await fetch(`/api/calendar?id=${id}`, { method: "DELETE" });
    await load(year, month);
  }

  async function cycleStatus(item: CalendarItem) {
    const order: CalendarItem["status"][] = ["idea", "drafting", "ready", "published"];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    await fetch("/api/calendar", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, status: next }),
    });
    await load(year, month);
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toDateStr(today);

  const filteredItems = platformFilter
    ? items.filter(i => i.platform === platformFilter)
    : items;

  const itemsByDate: Record<string, CalendarItem[]> = {};
  for (const item of filteredItems) {
    if (!itemsByDate[item.scheduled_date]) itemsByDate[item.scheduled_date] = [];
    itemsByDate[item.scheduled_date].push(item);
  }

  const selectedItems = selectedDate ? (itemsByDate[selectedDate] ?? []) : [];
  const allPlatformsUsed = [...new Set(items.map(i => i.platform))];

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted mb-2">
            <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
            {" › "}
            <span className="text-dark">Content Calendar</span>
          </p>
          <h1 className="text-2xl font-serif text-dark mb-1">Content Calendar</h1>
          <p className="text-sm text-muted">Plan and track your content schedule across all platforms.</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowForm(true); }}
          className="bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary-hover transition-colors shrink-0"
        >
          + Add item
        </button>
      </div>

      {/* Platform filter + status legend */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPlatformFilter(null)}
            className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
              platformFilter === null ? "bg-primary text-white border-primary" : "bg-white border-border text-dark hover:border-primary/30"
            }`}
          >
            All platforms
          </button>
          {allPlatformsUsed.map(p => (
            <button
              key={p}
              onClick={() => setPlatformFilter(platformFilter === p ? null : p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-colors ${
                platformFilter === p ? "bg-primary text-white border-primary" : "bg-white border-border text-dark hover:border-primary/30"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${PLATFORM_DOT[p] ?? "bg-muted"}`} />
              {PLATFORM_LABELS[p] ?? p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {(["idea", "drafting", "ready", "published"] as CalendarItem["status"][]).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
              <span className="text-xs text-muted">{STATUS_CONFIG[s].label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* Calendar grid */}
        <div className="col-span-2">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 hover:bg-light transition-colors text-muted hover:text-dark">
              ←
            </button>
            <h2 className="font-medium text-dark">{monthLabel(year, month)}</h2>
            <button onClick={nextMonth} className="p-2 hover:bg-light transition-colors text-muted hover:text-dark">
              →
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div className="grid grid-cols-7 gap-px bg-border">
              {[...Array(35)].map((_, i) => (
                <div key={i} className="h-20 bg-white animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-border border border-border">
              {/* Empty cells before month start */}
              {[...Array(firstDay)].map((_, i) => (
                <div key={`empty-${i}`} className="h-20 bg-light" />
              ))}
              {/* Day cells */}
              {[...Array(daysInMonth)].map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayItems = itemsByDate[dateStr] ?? [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`h-20 bg-white p-1.5 text-left flex flex-col hover:bg-light transition-colors ${
                      isSelected ? "ring-2 ring-inset ring-primary" : ""
                    }`}
                  >
                    <span className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center ${
                      isToday ? "bg-primary text-white rounded-full" : "text-dark"
                    }`}>
                      {day}
                    </span>
                    <div className="flex flex-wrap gap-0.5">
                      {dayItems.slice(0, 4).map(item => (
                        <span
                          key={item.id}
                          className={`w-2 h-2 rounded-full ${PLATFORM_DOT[item.platform] ?? "bg-muted"}`}
                          title={`${item.title} (${item.status})`}
                        />
                      ))}
                      {dayItems.length > 4 && (
                        <span className="text-[9px] text-muted">+{dayItems.length - 4}</span>
                      )}
                    </div>
                    {dayItems.length > 0 && dayItems.length <= 2 && (
                      <p className="text-[10px] text-muted truncate mt-0.5 leading-tight">
                        {dayItems[0].title}
                      </p>
                    )}
                  </button>
                );
              })}
              {/* Trailing empty cells to complete grid */}
              {(() => {
                const total = firstDay + daysInMonth;
                const trailing = total % 7 === 0 ? 0 : 7 - (total % 7);
                return [...Array(trailing)].map((_, i) => (
                  <div key={`trail-${i}`} className="h-20 bg-light" />
                ));
              })()}
            </div>
          )}
        </div>

        {/* Day panel */}
        <div className="flex flex-col gap-4">
          {selectedDate ? (
            <DayPanel
              date={selectedDate}
              items={selectedItems}
              onAdd={() => { setEditingItem(null); setShowForm(true); }}
              onEdit={(item) => { setEditingItem(item); setShowForm(true); }}
              onDelete={handleDelete}
              onCycleStatus={cycleStatus}
            />
          ) : (
            <div className="bg-white border border-border p-5 text-center">
              <p className="text-sm text-muted">Click a day to see what's scheduled.</p>
            </div>
          )}

          {/* Upcoming */}
          <UpcomingPanel items={filteredItems} todayStr={todayStr} />
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <ItemForm
          initial={editingItem}
          defaultDate={selectedDate ?? toDateStr(today)}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
        />
      )}
    </div>
  );
}

// ─── Day panel ─────────────────────────────────────────────────────────────────

function DayPanel({
  date,
  items,
  onAdd,
  onEdit,
  onDelete,
  onCycleStatus,
}: {
  date: string;
  items: CalendarItem[];
  onAdd: () => void;
  onEdit: (item: CalendarItem) => void;
  onDelete: (id: string) => void;
  onCycleStatus: (item: CalendarItem) => void;
}) {
  const d = new Date(date + "T12:00:00");
  const label = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="bg-white border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-dark">{label}</h3>
        <button
          onClick={onAdd}
          className="text-xs text-primary hover:underline"
        >
          + Add
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted">Nothing scheduled.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(item => {
            const status = STATUS_CONFIG[item.status];
            return (
              <div key={item.id} className="border border-border p-3 group">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm text-dark font-medium leading-snug flex-1">{item.title}</p>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => onEdit(item)} className="text-[11px] text-muted hover:text-dark transition-colors opacity-0 group-hover:opacity-100">Edit</button>
                    <button onClick={() => onDelete(item.id)} className="text-[11px] text-muted hover:text-accent transition-colors opacity-0 group-hover:opacity-100">×</button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 ${PLATFORM_DOT[item.platform] ? "" : ""}`}
                    style={{ background: "transparent" }}
                  >
                    <span className={`inline-flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${PLATFORM_DOT[item.platform] ?? "bg-muted"}`} />
                      <span className="text-muted">{PLATFORM_LABELS[item.platform] ?? item.platform}</span>
                    </span>
                  </span>
                  <button
                    onClick={() => onCycleStatus(item)}
                    className={`text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 cursor-pointer hover:opacity-80 transition-opacity ${status.badge}`}
                    title="Click to advance status"
                  >
                    {status.label}
                  </button>
                </div>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline mt-1 block truncate">
                    {item.url}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Upcoming panel ────────────────────────────────────────────────────────────

function UpcomingPanel({ items, todayStr }: { items: CalendarItem[]; todayStr: string }) {
  const upcoming = items
    .filter(i => i.scheduled_date >= todayStr && i.status !== "published")
    .slice(0, 5);

  if (upcoming.length === 0) return null;

  return (
    <div className="bg-white border border-border p-4">
      <h3 className="text-sm font-medium text-dark mb-3">Coming Up</h3>
      <div className="flex flex-col gap-2">
        {upcoming.map(item => {
          const d = new Date(item.scheduled_date + "T12:00:00");
          const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return (
            <div key={item.id} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PLATFORM_DOT[item.platform] ?? "bg-muted"}`} />
              <span className="text-xs text-dark flex-1 truncate">{item.title}</span>
              <span className="text-xs text-muted shrink-0">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Item form modal ───────────────────────────────────────────────────────────

function ItemForm({
  initial,
  defaultDate,
  onSave,
  onClose,
}: {
  initial: CalendarItem | null;
  defaultDate: string;
  onSave: (data: Omit<CalendarItem, "id" | "created_at">) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [platform, setPlatform] = useState(initial?.platform ?? "newsletter");
  const [status, setStatus] = useState<CalendarItem["status"]>(initial?.status ?? "idea");
  const [scheduledDate, setScheduledDate] = useState(initial?.scheduled_date ?? defaultDate);
  const [url, setUrl] = useState(initial?.url ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      platform,
      status,
      scheduled_date: scheduledDate,
      url: url.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 bg-dark/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white border border-border w-full max-w-md shadow-3">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-serif text-dark">{initial ? "Edit item" : "Add calendar item"}</h2>
          <button onClick={onClose} className="text-muted hover:text-dark transition-colors text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={submit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Title <span className="text-accent">*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
              placeholder="Newsletter: How to use Claude for research"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Platform</label>
              <select
                value={platform}
                onChange={e => setPlatform(e.target.value)}
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              >
                {PLATFORMS.map(p => (
                  <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark mb-1.5">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as CalendarItem["status"])}
                className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
              >
                <option value="idea">Idea</option>
                <option value="drafting">Drafting</option>
                <option value="ready">Ready</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Scheduled date <span className="text-accent">*</span></label>
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              required
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">URL <span className="text-muted font-normal text-xs">(optional — paste when published)</span></label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark mb-1.5">Notes <span className="text-muted font-normal text-xs">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Hook idea, angle, key points…"
              className="w-full border border-border bg-light px-3 py-2 text-sm text-dark focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 bg-primary text-white text-sm font-medium py-2 hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : initial ? "Save changes" : "Add to calendar"}
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
