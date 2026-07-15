"use client";

import { useEffect, useRef, useState } from "react";
import { recordCalibrationAction } from "@/app/(app)/talk/actions";

type Msg = {
  id: string;
  role: "user" | "clone";
  content: string;
  streaming?: boolean;
  calibration?: "closer" | "not_quite";
};

type ApiEvent =
  | { type: "delta"; text: string }
  | { type: "complete"; content: string }
  | { type: "error"; message: string };

export function TalkChat({ tag, hasProfile }: { tag: string; hasProfile: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setError(null);

    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    const cloneId = crypto.randomUUID();
    const withUser = [...messages, userMsg];
    setMessages([...withUser, { id: cloneId, role: "clone", content: "", streaming: true }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: withUser.map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          })),
        }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Something went wrong.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const evt = JSON.parse(line) as ApiEvent;
          if (evt.type === "delta") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === cloneId ? { ...m, content: m.content + evt.text } : m,
              ),
            );
          } else if (evt.type === "complete") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === cloneId ? { ...m, content: evt.content, streaming: false } : m,
              ),
            );
          } else if (evt.type === "error") {
            setError(evt.message);
            setMessages((prev) => prev.filter((m) => m.id !== cloneId));
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setMessages((prev) => prev.filter((m) => m.id !== cloneId));
    } finally {
      setBusy(false);
    }
  }

  function calibrate(id: string, signal: "closer" | "not_quite", excerpt: string) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, calibration: signal } : m)));
    // Fire-and-forget; the full feedback loop is deferred.
    void recordCalibrationAction({ signal, excerpt: excerpt.slice(0, 280) });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)]">
      {/* Thread */}
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="mt-8 text-center text-sm text-[var(--t-faint)]">
            {hasProfile
              ? "Ask anything. Answers come back shaped by your profile."
              : "Start chatting. Import a profile to calibrate it to you."}
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-[var(--line-2)] bg-[var(--surface-2)] px-4 py-2.5 text-sm text-[var(--text)]">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex flex-col items-start gap-1">
              <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-[color:color-mix(in_srgb,var(--cool)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--cool)_8%,transparent)] px-4 py-3 text-sm text-[var(--text)]">
                <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[var(--cool-soft)]">
                  in your style: {tag}
                </p>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {m.content}
                  {m.streaming && (
                    <span className="ml-0.5 inline-block h-4 w-1.5 animate-type-cursor bg-[var(--cool-soft)] align-[-2px]" />
                  )}
                </p>
              </div>
              {!m.streaming && m.content && (
                <div className="ml-1 flex items-center gap-3 text-[11px] text-[var(--t-faint)]">
                  {m.calibration ? (
                    <span>Thanks, noted.</span>
                  ) : (
                    <>
                      <span>Did that land?</span>
                      <button
                        type="button"
                        onClick={() => calibrate(m.id, "closer", m.content)}
                        className="transition hover:text-[var(--ok)]"
                      >
                        Closer
                      </button>
                      <button
                        type="button"
                        onClick={() => calibrate(m.id, "not_quite", m.content)}
                        className="transition hover:text-[#e08a8a]"
                      >
                        Not quite
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-[var(--line)] p-4">
        {error && <p className="mb-2 text-sm text-[#e08a8a]">{error}</p>}
        <div className="flex items-end gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Ask anything…"
            className="flex-1 resize-none rounded-lg border border-[var(--line)] bg-black/20 p-3 text-sm text-[var(--text)] placeholder:text-[var(--t-faint)] focus:outline-none"
          />
          <button
            type="button"
            onClick={send}
            disabled={busy || input.trim().length === 0}
            className="rounded-lg bg-[var(--amber)] px-5 py-2.5 text-sm font-semibold text-black transition enabled:hover:bg-[var(--amber-soft)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
