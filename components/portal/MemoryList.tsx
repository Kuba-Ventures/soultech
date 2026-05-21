"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { redactMemoryAction } from "@/app/portal/memories/actions";

export type MemoryRow = {
  id: string;
  sourceType: "chat" | "upload_doc" | "upload_audio" | "voice_memo";
  content: string;
  contentSummary: string;
  createdAt: string;
  redacted: boolean;
  redactionReason: string | null;
};

type Props = {
  memories: MemoryRow[];
  page: number;
  totalPages: number;
  source: string | null;
};

export function MemoryList({ memories, page, totalPages, source }: Props) {
  if (memories.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-center text-sm text-white/55">
        Nothing here yet. Try a reflection or upload a document.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <ul className="space-y-3">
        {memories.map((m) => (
          <MemoryItem key={m.id} memory={m} />
        ))}
      </ul>
      <Pager page={page} totalPages={totalPages} source={source} />
    </div>
  );
}

function MemoryItem({ memory }: { memory: MemoryRow }) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onRedact() {
    if (!confirm("Redact this memory? It won't be used for retrieval going forward.")) return;
    setError(null);
    startTransition(async () => {
      const result = await redactMemoryAction({ memoryId: memory.id });
      if (!result.ok) setError(result.error);
    });
  }

  const date = new Date(memory.createdAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <li
      className={`rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition ${
        memory.redacted ? "opacity-50" : "hover:border-white/15"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/40">
            <span>{sourceLabel(memory.sourceType)}</span>
            <span>·</span>
            <span>{date}</span>
            {memory.redacted && (
              <>
                <span>·</span>
                <span className="text-rose-400">redacted</span>
              </>
            )}
          </div>
          <div className="mt-2 text-sm text-white/85 leading-relaxed">
            {expanded ? memory.content : memory.contentSummary}
          </div>
          {memory.content !== memory.contentSummary && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-[11px] uppercase tracking-wider text-white/40 hover:text-white/70"
            >
              {expanded ? "Show summary" : "Show full"}
            </button>
          )}
          {memory.redacted && memory.redactionReason && (
            <div className="mt-2 text-[11px] text-rose-400/70">
              Reason: {memory.redactionReason}
            </div>
          )}
        </div>
        {!memory.redacted && (
          <button
            type="button"
            onClick={onRedact}
            disabled={pending}
            className="shrink-0 text-[11px] uppercase tracking-wider text-white/35 hover:text-rose-400 disabled:opacity-50 transition"
          >
            {pending ? "Redacting…" : "Redact"}
          </button>
        )}
      </div>
      {error && <div className="mt-2 text-xs text-rose-400">{error}</div>}
    </li>
  );
}

function Pager({
  page,
  totalPages,
  source,
}: {
  page: number;
  totalPages: number;
  source: string | null;
}) {
  if (totalPages <= 1) return null;
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (source) params.set("source", source);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/portal/memories?${s}` : "/portal/memories";
  };

  return (
    <div className="mt-6 flex items-center justify-between text-xs text-white/50">
      {page > 1 ? (
        <Link href={qs(page - 1)} className="hover:text-white">
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span>
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={qs(page + 1)} className="hover:text-white">
          Next →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

function sourceLabel(s: MemoryRow["sourceType"]): string {
  return {
    chat: "Reflect chat",
    upload_doc: "Document",
    upload_audio: "Audio",
    voice_memo: "Voice memo",
  }[s];
}
