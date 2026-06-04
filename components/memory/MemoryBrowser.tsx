"use client";

import { useState, useTransition } from "react";
import { redactMemoryAction } from "@/app/(app)/memory/actions";
import { onActivateKey } from "@/lib/ui/onActivateKey";

export type MemoryItem = {
  id: string;
  type: "FACT" | "PLAN" | "MEMORY" | "PREFERENCE";
  body: string;
  source: string;
  date: string;
  redacted: boolean;
};

const TYPE_META: Record<
  MemoryItem["type"],
  { chip: string; label: string }
> = {
  FACT: { chip: "fact", label: "Fact" },
  PLAN: { chip: "plan", label: "Plan" },
  MEMORY: { chip: "mem", label: "Memory" },
  PREFERENCE: { chip: "pref", label: "Preference" },
};

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "FACT", label: "Facts" },
  { key: "PLAN", label: "Plans" },
  { key: "MEMORY", label: "Memories" },
  { key: "PREFERENCE", label: "Preferences" },
];

export function MemoryBrowser({ items }: { items: MemoryItem[] }) {
  const [filter, setFilter] = useState("ALL");
  const [redacted, setRedacted] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  const shown =
    filter === "ALL" ? items : items.filter((m) => m.type === filter);

  function redact(id: string) {
    setRedacted((p) => ({ ...p, [id]: true }));
    startTransition(async () => {
      await redactMemoryAction(id);
    });
  }

  return (
    <>
      <div className="filters rise">
        {FILTERS.map((f) => (
          <span
            key={f.key}
            className={`chip${filter === f.key ? " on" : ""}`}
            role="button"
            tabIndex={0}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            onKeyDown={onActivateKey(() => setFilter(f.key))}
          >
            {f.label}
          </span>
        ))}
      </div>
      <div className="rise">
        {shown.map((m) => {
          const isRedacted = m.redacted || redacted[m.id];
          const meta = TYPE_META[m.type];
          return (
            <div key={m.id} className={`mem${isRedacted ? " redacted" : ""}`}>
              <div className="meta">
                <span>
                  <span className={`mtype ${meta.chip}`}>{meta.label}</span>
                  <span className="src">
                    from {m.source} · {m.date}
                  </span>
                </span>
                <button
                  type="button"
                  className="redact"
                  disabled={isRedacted}
                  onClick={() => redact(m.id)}
                >
                  {isRedacted ? "Redacted" : "Redact"}
                </button>
              </div>
              <div className="body">{m.body}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
