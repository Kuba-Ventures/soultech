"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendInterviewerMessage } from "@/app/portal/reflect/actions";

type UIMessage = {
  id: string;
  role: "member" | "clone";
  content: string;
  createdAt: string;
};

type Props = {
  initialMessages: UIMessage[];
};

export function InterviewerChat({ initialMessages }: Props) {
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, pending]);

  function submit() {
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
      },
    ]);
    setDraft("");
    setError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("content", content);
      const result = await sendInterviewerMessage(fd);
      if (!result.ok) {
        setError(result.error);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setDraft(content);
        return;
      }
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticId),
        {
          id: result.member.id,
          role: "member",
          content: result.member.content,
          createdAt: result.member.createdAt.toString(),
        },
        {
          id: result.clone.id,
          role: "clone",
          content: result.clone.content,
          createdAt: result.clone.createdAt.toString(),
        },
      ]);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-8 py-6 space-y-5 max-w-3xl w-full"
      >
        {messages.length === 0 && (
          <div className="text-sm text-white/45 leading-relaxed">
            The Interviewer is waiting. Try a first thought: something you&rsquo;ve
            been chewing on, a decision you&rsquo;re weighing, or a story you keep
            telling yourself.
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {pending && (
          <div className="flex items-center gap-1.5 text-white/40 text-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse-soft" />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse-soft [animation-delay:150ms]" />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse-soft [animation-delay:300ms]" />
          </div>
        )}
      </div>

      <div className="border-t border-white/8 px-8 py-4">
        <div className="max-w-3xl">
          {error && (
            <div className="mb-2 text-sm text-rose-400">{error}</div>
          )}
          <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 focus-within:border-white/25 transition">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Say what you mean…"
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
            ⌘+Enter to send.
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isMember = message.role === "member";
  return (
    <div className={`flex ${isMember ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isMember
            ? "bg-white/[0.06] text-white/90 rounded-br-sm"
            : "bg-gradient-to-br from-indigo-500/12 to-fuchsia-500/8 border border-white/8 text-white/85 rounded-bl-sm"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
