"use client";

import { useEffect, useRef, useState } from "react";
import { extractAndSave, type SavedChip } from "@/app/(app)/chat/actions";

type Msg = {
  id: string;
  role: "member" | "clone";
  content: string;
  chips?: SavedChip[];
};

const STREAMING_ID = "__streaming__";
const CHIP_LABEL: Record<SavedChip["type"], string> = {
  FACT: "Fact saved",
  PLAN: "Plan saved",
  PREFERENCE: "Preference saved",
};

export function CloneChat({ initialMessages }: { initialMessages: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending]);

  async function submit() {
    const content = draft.trim();
    if (!content || pending) return;
    const memberId = `tmp-${content.length}-${messages.length}`;
    setMessages((p) => [
      ...p,
      { id: memberId, role: "member", content },
      { id: STREAMING_ID, role: "clone", content: "" },
    ]);
    setDraft("");
    setError(null);
    setPending(true);

    // Auto-save runs alongside the reply; chips attach to the member message.
    void extractAndSave(content).then((chips) => {
      if (chips.length) {
        setMessages((p) =>
          p.map((m) => (m.id === memberId ? { ...m, chips } : m)),
        );
      }
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok || !res.body) {
        const b = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(b.error ?? "Request failed");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let streamed = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let evt: { type: string; text?: string; clone?: { content: string } };
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }
          if (evt.type === "delta" && evt.text) {
            streamed += evt.text;
            const snap = streamed;
            setMessages((p) =>
              p.map((m) => (m.id === STREAMING_ID ? { ...m, content: snap } : m)),
            );
          } else if (evt.type === "complete" && evt.clone) {
            const finalContent = evt.clone.content;
            setMessages((p) =>
              p.map((m) =>
                m.id === STREAMING_ID
                  ? { id: `clone-${p.length}`, role: "clone", content: finalContent }
                  : m,
              ),
            );
          } else if (evt.type === "error") {
            throw new Error("The clone hit an error. Try again.");
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setMessages((p) => p.filter((m) => m.id !== STREAMING_ID));
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
    <>
      <div className="thread rise" ref={listRef}>
        {messages.map((m) =>
          m.role === "member" ? (
            <div key={m.id} style={{ alignSelf: "flex-end", maxWidth: "82%" }}>
              <div className="a" style={{ maxWidth: "100%" }}>
                {m.content}
              </div>
              {m.chips && m.chips.length > 0 && (
                <div style={{ textAlign: "right" }}>
                  {m.chips.map((c, i) => (
                    <span className="saved" key={i}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12l4 4 10-10" />
                      </svg>
                      <b>{CHIP_LABEL[c.type]}</b> · {c.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="a clone" key={m.id}>
              <div className="lab">You · your clone</div>
              {m.content || (
                <span className="typing">
                  <span />
                  <span />
                  <span />
                </span>
              )}
            </div>
          ),
        )}
      </div>

      <div className="composer rise">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Say anything, I'll keep what matters…"
          disabled={pending}
        />
        <div className="crow">
          <span className="hint">
            {error ?? "Plans, facts, and decisions save to Memory automatically."}
          </span>
          <button
            type="button"
            className="btn"
            onClick={submit}
            disabled={pending || !draft.trim()}
          >
            {pending ? "…" : "Send"}
          </button>
        </div>
      </div>
    </>
  );
}
