"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  resetChatsAction,
  restartOnboardingAction,
} from "@/app/(app)/settings/actions";

export function SettingsPanel() {
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pending, startTransition] = useTransition();

  function resetChats() {
    setNote(null);
    setError(null);
    startTransition(async () => {
      const r = await resetChatsAction();
      if (r.ok) {
        setConfirmReset(false);
        setNote(
          r.removed === 0
            ? "You had no chats to remove."
            : `Removed ${r.removed} chat${r.removed === 1 ? "" : "s"}.`,
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

      {/* Reset data - remove chats */}
      <div className={`${card} border-[#5a2b2b] bg-[#2a1414]/40`}>
        <div className="font-display text-base text-[var(--text)]">
          Reset data - remove chats
        </div>
        <p className="mt-1 text-sm text-[var(--t-dim)]">
          Permanently deletes your chat history (every conversation and message). Your
          profile is not affected. This can&apos;t be undone.
        </p>
        {confirmReset ? (
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={resetChats}
              disabled={pending}
              className={`${btn} bg-[#b34747] text-white`}
            >
              Yes, remove all my chats
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
            Reset data - remove chats
          </button>
        )}
      </div>
    </div>
  );
}
