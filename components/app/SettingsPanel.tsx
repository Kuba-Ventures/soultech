"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  resetAllDataAction,
  restartOnboardingAction,
} from "@/app/(app)/settings/actions";

export function SettingsPanel() {
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pending, startTransition] = useTransition();

  function resetAll() {
    setNote(null);
    setError(null);
    startTransition(async () => {
      const r = await resetAllDataAction();
      if (r.ok) {
        setConfirmReset(false);
        const c = r.counts;
        setNote(
          `Account wiped. Removed ${c.conversations} chat${c.conversations === 1 ? "" : "s"}, ${c.memories} memor${c.memories === 1 ? "y" : "ies"}, ${c.sources} source${c.sources === 1 ? "" : "s"}, and your profile.`,
        );
      } else setError(r.error);
    });
  }

  function restartOnboarding() {
    setNote(null);
    setError(null);
    startTransition(async () => {
      const r = await restartOnboardingAction();
      if (r.ok) router.push("/welcome?restart=1");
      else setError(r.error);
    });
  }

  const card =
    "rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-5";
  const btn =
    "rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-col gap-5">
      {(note || error) && (
        <p className={`text-sm ${error ? "text-[#e08a8a]" : "text-[var(--ok)]"}`}>
          {error ?? note}
        </p>
      )}

      {/* Restart onboarding */}
      <div className={card}>
        <div className="font-display text-base text-[var(--text)]">Restart onboarding</div>
        <p className="mt-1 text-sm text-[var(--t-dim)]">
          Run the first-run setup again: paste a self-portrait, upload documents, review
          your profile. Your existing profile stays; anything you add appends to it.
        </p>
        <button
          type="button"
          onClick={restartOnboarding}
          disabled={pending}
          className={`${btn} mt-3 border border-[var(--line-2)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-white/10`}
        >
          Restart onboarding
        </button>
      </div>

      {/* Reset data - wipe the account clean */}
      <div className={`${card} border-[#5a2b2b] bg-[#2a1414]/40`}>
        <div className="font-display text-base text-[var(--text)]">
          Reset data - wipe everything
        </div>
        <p className="mt-1 text-sm text-[var(--t-dim)]">
          Permanently deletes everything in your account: chats, memories, sources, and
          your profile. Your login stays, but you start over from onboarding. This can&apos;t
          be undone.
        </p>
        {confirmReset ? (
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={resetAll}
              disabled={pending}
              className={`${btn} bg-[#b34747] text-white`}
            >
              Yes, wipe everything
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className={`${btn} border border-[var(--line-2)] text-[var(--t-dim)]`}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className={`${btn} mt-3 border border-[#7a3a3a] text-[#e0a0a0] hover:bg-[#3a1c1c]`}
          >
            Reset data - wipe everything
          </button>
        )}
      </div>
    </div>
  );
}
