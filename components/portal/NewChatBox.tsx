"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUp } from "lucide-react";

export function NewChatBox() {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  function start() {
    const content = draft.trim();
    if (!content || pending) return;
    setPending(true);
    router.push(`/portal/chat?q=${encodeURIComponent(content)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      start();
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2 focus-within:border-white/25 transition">
      <div className="flex items-end gap-3 px-3 py-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          autoFocus
          placeholder="Ask your clone anything…"
          disabled={pending}
          className="flex-1 resize-none bg-transparent text-base text-white placeholder:text-white/30 focus:outline-none min-h-[48px] max-h-[200px] leading-relaxed"
        />
        <button
          type="button"
          onClick={start}
          disabled={pending || !draft.trim()}
          aria-label="Start chat"
          className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:cursor-default transition"
        >
          <ArrowUp size={18} strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
