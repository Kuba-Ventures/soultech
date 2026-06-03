"use client";

import { useEffect, useRef, useState } from "react";
import type { CitedMessage } from "@/app/portal/chat/types";

type Props = {
  initialMessages: CitedMessage[];
};

type StreamEvent =
  | { type: "member"; id: string; content: string; createdAt: string }
  | { type: "delta"; text: string }
  | {
      type: "complete";
      clone: {
        id: string;
        content: string;
        createdAt: string;
        citations: CitedMessage["citations"];
      };
    }
  | { type: "error"; message: string; detail?: string };

const STREAMING_ID = "__streaming__";

export function ReflectiveChat({ initialMessages }: Props) {
  const [messages, setMessages] = useState<CitedMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  async function submit() {
    const content = draft.trim();
    if (!content || pending) return;

    const optimisticId = `tmp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        role: "member",
        content,
        createdAt: new Date().toISOString(),
        citations: [],
      },
      {
        id: STREAMING_ID,
        role: "clone",
        content: "",
        createdAt: new Date().toISOString(),
        citations: [],
      },
    ]);
    setDraft("");
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(body.error ?? "Request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let streamingText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let evt: StreamEvent;
          try {
            evt = JSON.parse(line) as StreamEvent;
          } catch {
            continue;
          }
          if (evt.type === "member") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === optimisticId
                  ? {
                      ...m,
                      id: evt.id,
                      content: evt.content,
                      createdAt: evt.createdAt,
                    }
                  : m,
              ),
            );
          } else if (evt.type === "delta") {
            streamingText += evt.text;
            const snapshot = streamingText;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === STREAMING_ID ? { ...m, content: snapshot } : m,
              ),
            );
          } else if (evt.type === "complete") {
            const finalMsg = evt.clone;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === STREAMING_ID
                  ? {
                      id: finalMsg.id,
                      role: "clone",
                      content: finalMsg.content,
                      createdAt: finalMsg.createdAt,
                      citations: finalMsg.citations,
                    }
                  : m,
              ),
            );
          } else if (evt.type === "error") {
            throw new Error(evt.message);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      // Drop optimistic msgs on failure; restore draft so the member can retry.
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimisticId && m.id !== STREAMING_ID),
      );
      setDraft(content);
    } finally {
      setPending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-8 py-6 space-y-6 max-w-3xl w-full"
      >
        {messages.length === 0 && (
          <div className="text-sm text-white/45 leading-relaxed">
            Ask your clone something. It can only draw on what it knows about
            you, so the more you share, the deeper this gets.
          </div>
        )}
        {messages.map((m) => (
          <MessageBlock
            key={m.id}
            message={m}
            streaming={m.id === STREAMING_ID && pending}
          />
        ))}
      </div>

      <div className="border-t border-white/8 px-8 py-4">
        <div className="max-w-3xl">
          {error && <div className="mb-2 text-sm text-rose-400">{error}</div>}
          <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 focus-within:border-white/25 transition">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Ask your clone…"
              disabled={pending}
              className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none min-h-[24px] max-h-[200px]"
            />
            <button
              type="button"
              onClick={submit}
              disabled={pending || !draft.trim()}
              className="shrink-0 inline-flex items-center justify-center rounded-full bg-white text-black px-4 py-1.5 text-xs font-medium hover:bg-white/90 disabled:opacity-40 transition"
            >
              Send
            </button>
          </div>
          <div className="mt-1.5 text-[11px] text-white/30">
            Enter to send. Shift+Enter for a new line.
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBlock({
  message,
  streaming,
}: {
  message: CitedMessage;
  streaming: boolean;
}) {
  const isMember = message.role === "member";
  if (isMember) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-br-sm bg-white/[0.06] px-4 py-3 text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  const empty = streaming && message.content.length === 0;

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] space-y-3">
        <div className="rounded-2xl rounded-bl-sm border border-white/8 bg-gradient-to-br from-indigo-500/12 to-fuchsia-500/8 px-4 py-3 text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
          {empty ? (
            <span className="inline-flex items-center gap-1.5 text-white/45">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse-soft" />
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse-soft [animation-delay:150ms]" />
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse-soft [animation-delay:300ms]" />
            </span>
          ) : (
            <RenderWithCitations
              content={message.content}
              citations={message.citations}
            />
          )}
          {streaming && message.content.length > 0 && (
            <span className="inline-block w-1.5 h-4 align-[-2px] ml-0.5 bg-white/60 animate-type-cursor" />
          )}
        </div>
        {!streaming && message.citations.length > 0 && (
          <CitationList citations={message.citations} />
        )}
      </div>
    </div>
  );
}

function RenderWithCitations({
  content,
  citations,
}: {
  content: string;
  citations: CitedMessage["citations"];
}) {
  const labelMap = new Map(citations.map((c) => [c.label, c]));
  const parts: Array<{ kind: "text" | "cite"; value: string }> = [];
  let cursor = 0;
  const regex = /\[M\d+\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > cursor) {
      parts.push({ kind: "text", value: content.slice(cursor, match.index) });
    }
    parts.push({ kind: "cite", value: match[0].slice(1, -1) });
    cursor = match.index + match[0].length;
  }
  if (cursor < content.length) {
    parts.push({ kind: "text", value: content.slice(cursor) });
  }

  return (
    <>
      {parts.map((p, idx) => {
        if (p.kind === "text") return <span key={idx}>{p.value}</span>;
        const cit = labelMap.get(p.value);
        if (!cit) return <span key={idx}>[{p.value}]</span>;
        return (
          <a
            key={idx}
            href={`#cite-${cit.id}`}
            className="ml-0.5 inline-flex items-center justify-center rounded bg-white/10 px-1 text-[10px] font-medium text-white/80 hover:bg-white/20 transition no-underline align-baseline"
          >
            {p.value}
          </a>
        );
      })}
    </>
  );
}

function CitationList({
  citations,
}: {
  citations: CitedMessage["citations"];
}) {
  return (
    <details className="rounded-xl border border-white/8 bg-white/[0.015] px-4 py-3 text-xs">
      <summary className="cursor-pointer text-white/55 hover:text-white/75 transition select-none">
        Sources ({citations.length})
      </summary>
      <ul className="mt-3 space-y-3">
        {citations.map((c) => (
          <li key={c.id} id={`cite-${c.id}`} className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-white/40">
              {c.label} · {sourceLabel(c.sourceType)} ·{" "}
              {new Date(c.createdAt).toLocaleDateString()}
            </div>
            <div className="text-white/75 leading-relaxed">
              {c.contentSummary}
            </div>
            <details className="text-white/55">
              <summary className="cursor-pointer text-[11px] text-white/40 hover:text-white/65">
                Show full
              </summary>
              <div className="mt-2 whitespace-pre-wrap leading-relaxed">
                {c.content}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </details>
  );
}

function sourceLabel(s: CitedMessage["citations"][number]["sourceType"]): string {
  return {
    chat: "Reflect chat",
    upload_doc: "Document",
    upload_audio: "Audio",
    voice_memo: "Voice memo",
  }[s];
}
