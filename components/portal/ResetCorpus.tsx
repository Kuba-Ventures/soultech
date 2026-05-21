"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetCorpusAction, type ResetCorpusResult } from "@/app/portal/settings/actions";

export function ResetCorpus() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<Extract<ResetCorpusResult, { ok: true }>["counts"] | null>(null);

  function onReset() {
    if (
      !confirm(
        "Reset your corpus? Memories, conversations, uploads, and audit log get wiped. Your account stays.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await resetCorpusAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLast(result.counts);
      router.push("/portal/onboarding");
      router.refresh();
    });
  }

  return (
    <section className="mt-10 rounded-2xl border border-amber-400/20 bg-amber-400/[0.025] p-5">
      <div className="text-xs uppercase tracking-wider text-amber-200">
        Reset corpus
      </div>
      <h2 className="mt-2 text-base font-medium text-white/85">
        Start fresh
      </h2>
      <p className="mt-2 text-sm text-white/55 leading-relaxed">
        Wipes every memory, conversation, upload, and audit-log entry. Your
        account, Clerk session, and onboarding state get cleared so the next
        visit starts at onboarding from scratch.
      </p>

      <button
        type="button"
        onClick={onReset}
        disabled={pending}
        className="mt-4 inline-flex items-center justify-center rounded-full border border-amber-400/40 text-amber-200 px-4 py-2 text-xs hover:bg-amber-400/10 disabled:opacity-50 transition"
      >
        {pending ? "Wiping…" : "Reset my corpus"}
      </button>

      {error && <div className="mt-2 text-xs text-rose-400">{error}</div>}

      {last && !error && (
        <div className="mt-3 text-xs text-amber-200/70">
          Wiped {last.memories} memor{last.memories === 1 ? "y" : "ies"},{" "}
          {last.sources} source{last.sources === 1 ? "" : "s"},{" "}
          {last.conversations} conversation
          {last.conversations === 1 ? "" : "s"}, {last.messages} message
          {last.messages === 1 ? "" : "s"}, {last.audit} audit row
          {last.audit === 1 ? "" : "s"}.
        </div>
      )}
    </section>
  );
}
