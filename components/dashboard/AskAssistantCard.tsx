"use client";

import { useState } from "react";

export default function AskAssistantCard() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask() {
    const text = prompt.trim();
    if (!text || loading) return;

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: text }] }),
      });

      if (!res.ok) throw new Error("Request failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setResponse(content);
      }
    } catch (err) {
      setResponse(`Error: ${err instanceof Error ? err.message : "Something went wrong"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <h2 className="font-medium text-dark mb-4">Quick Question</h2>
      <div className="flex gap-2 mb-3">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Ask your AI assistant anything..."
          className="flex-1 text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
          disabled={loading}
        />
        <button
          onClick={ask}
          disabled={loading || !prompt.trim()}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {loading ? "..." : "Ask"}
        </button>
      </div>
      {response && (
        <div className="bg-light rounded-lg p-3 text-sm text-dark whitespace-pre-wrap max-h-48 overflow-y-auto">
          {response}
        </div>
      )}
    </div>
  );
}
