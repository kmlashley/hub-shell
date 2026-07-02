"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [savedIdx, setSavedIdx] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = useCallback(async () => {
    const r = await fetch("/api/chat/conversations");
    const d = await r.json();
    setConversations(d.conversations ?? []);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  async function openConversation(id: string) {
    setActiveId(id);
    setLoadingMessages(true);
    const r = await fetch(`/api/chat/conversations/${id}`);
    const d = await r.json();
    setMessages(d.messages ?? []);
    setLoadingMessages(false);
  }

  async function newConversation() {
    const r = await fetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Conversation" }),
    });
    const d = await r.json();
    if (d.conversation) {
      setConversations((prev) => [d.conversation, ...prev]);
      setActiveId(d.conversation.id);
      setMessages([]);
      setSavedIdx(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    // Auto-create conversation on first send
    let convId = activeId;
    if (!convId) {
      const r = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Conversation" }),
      });
      const d = await r.json();
      if (!d.conversation) return;
      convId = d.conversation.id;
      setActiveId(convId);
      setConversations((prev) => [d.conversation, ...prev]);
    }

    const isFirst = messages.length === 0;
    const userMsg: Message = { role: "user", content: text };
    const history = [...messages, userMsg];

    setMessages(history);
    setInput("");
    setStreaming(true);
    setSavedIdx(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) throw new Error("Chat request failed");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let assistantContent = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantContent };
          return updated;
        });
      }

      // Persist both messages; auto-title on first exchange
      await fetch(`/api/chat/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userContent: text, assistantContent, isFirst }),
      });

      if (isFirst) {
        const newTitle = text.slice(0, 60).trim();
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: newTitle } : c))
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setStreaming(false);
    }
  }

  async function saveToNotes(content: string, idx: number) {
    setSavedIdx(idx);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  }

  async function deleteConversation(id: string) {
    if (!window.confirm("Delete this conversation?")) return;
    await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  }

  async function commitRename(id: string) {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    await fetch(`/api/chat/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: renameValue.trim() }),
    });
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: renameValue.trim() } : c))
    );
    setRenamingId(null);
  }

  const activeConversation = conversations.find((c) => c.id === activeId);

  return (
    <div className="max-w-6xl mx-auto">

      {/* Breadcrumb */}
      <p className="text-xs text-muted mb-4">
        <Link href="/" className="hover:text-dark transition-colors">Dashboard</Link>
        {" › "}
        <span className="text-dark">AI Chat</span>
      </p>

      {/* Main chat container */}
      <div className="flex border border-border bg-white" style={{ height: "calc(100vh - 7rem)" }}>

        {/* ── Conversation List ── */}
        <div className="w-[220px] shrink-0 border-r border-border flex flex-col bg-light">
          <div className="px-3 py-3 border-b border-border">
            <button
              onClick={newConversation}
              className="w-full bg-primary text-white text-xs font-medium py-2 hover:bg-primary-hover transition-colors"
            >
              + New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted text-center py-8 px-3">No conversations yet.</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group relative border-b border-border transition-colors ${
                    activeId === conv.id ? "bg-teal-tint" : "hover:bg-white"
                  }`}
                >
                  {renamingId === conv.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(conv.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(conv.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="w-full px-3 py-3 text-xs text-dark bg-transparent focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => openConversation(conv.id)}
                      className="w-full text-left px-3 py-2.5 pr-10"
                    >
                      <p className={`text-xs line-clamp-2 leading-snug ${
                        activeId === conv.id ? "text-primary font-medium" : "text-dark"
                      }`}>
                        {conv.title}
                      </p>
                      <p className="text-[10px] text-muted mt-0.5">
                        {new Date(conv.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </button>
                  )}

                  <div className="absolute right-1.5 top-2 hidden group-hover:flex gap-0.5">
                    <button
                      onClick={() => { setRenamingId(conv.id); setRenameValue(conv.title); }}
                      className="text-[11px] text-muted hover:text-dark p-1 transition-colors"
                      title="Rename"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => deleteConversation(conv.id)}
                      className="text-[11px] text-muted hover:text-accent p-1 transition-colors"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <div className="px-5 py-3 border-b border-border shrink-0">
            <p className="text-sm font-medium text-dark">
              {activeConversation ? activeConversation.title : "AI Chat"}
            </p>
            <p className="text-[11px] text-muted">
              Loaded with your hub context. Ask about strategy, content, offers, or anything business-related.
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

            {!activeId && messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center mt-16">
                <div className="text-2xl mb-3 text-primary font-serif">✦</div>
                <p className="text-sm font-medium text-dark mb-1">AI Business Assistant</p>
                <p className="text-xs text-muted max-w-[300px] leading-relaxed">
                  Ask about your content strategy, business decisions, offer positioning, or get a sharp second opinion on anything.
                </p>
                <p className="text-[11px] text-muted mt-3">Start typing or click &ldquo;+ New Chat&rdquo; to begin.</p>
              </div>
            )}

            {loadingMessages ? (
              <div className="flex flex-col gap-3 pt-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-10 bg-light animate-pulse ${
                      i % 2 === 0 ? "self-end w-2/3" : "self-start w-3/4"
                    }`}
                  />
                ))}
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`text-sm px-4 py-3 max-w-[76%] whitespace-pre-wrap leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-white"
                        : "bg-light text-dark border border-border"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "assistant" && msg.content && !streaming && (
                    <button
                      onClick={() => saveToNotes(msg.content, i)}
                      className={`text-[10px] transition-colors ${
                        savedIdx === i
                          ? "text-primary font-medium"
                          : "text-muted hover:text-primary"
                      }`}
                    >
                      {savedIdx === i ? "Saved to notes ✓" : "Save to notes"}
                    </button>
                  )}
                </div>
              ))
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-4 border-t border-border shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask something… (Enter to send, Shift+Enter for new line)"
                rows={2}
                disabled={streaming}
                className="flex-1 text-sm border border-border bg-light px-4 py-3 resize-none focus:outline-none focus:border-primary transition-colors placeholder:text-muted disabled:opacity-60"
              />
              <button
                onClick={sendMessage}
                disabled={streaming || !input.trim()}
                className="bg-primary text-white text-sm font-medium px-5 py-3 hover:bg-primary-hover transition-colors disabled:opacity-40 self-end"
              >
                {streaming ? "…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
