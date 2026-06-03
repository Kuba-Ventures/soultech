"use client";

import { useState, useTransition } from "react";
import { deleteAccountAction } from "@/app/portal/settings/actions";

type Props = {
  email: string;
};

export function AccountDeletion({ email }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!confirmEmail.trim()) {
      setError("Type your email to confirm.");
      return;
    }
    if (!confirm("This permanently wipes your memories, uploads, conversations, and account. No undo.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteAccountAction({ confirmEmail });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // FK cascade + Clerk delete complete. Send them home.
      window.location.href = "/";
    });
  }

  return (
    <section className="mt-12 rounded-2xl border border-rose-400/20 bg-rose-400/[0.025] p-5">
      <div className="text-xs uppercase tracking-wider text-rose-300">
        Danger zone
      </div>
      <h2 className="mt-2 text-base font-medium text-white/85">
        Delete account
      </h2>
      <p className="mt-2 text-sm text-white/55 leading-relaxed">
        Permanently wipes your memories, uploads, all conversations, audit log,
        and Clerk account. Cannot be undone.
      </p>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-4 inline-flex items-center justify-center rounded-full border border-rose-400/40 text-rose-300 px-4 py-2 text-xs hover:bg-rose-400/10 transition"
        >
          I want to delete my account
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-white/45">
              Type your email to confirm
            </span>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={email}
              autoComplete="off"
              disabled={pending}
              className="mt-1 w-full bg-transparent rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 border border-rose-400/30 focus:outline-none focus:border-rose-400/60"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onDelete}
              disabled={pending || confirmEmail.trim().toLowerCase() !== email.trim().toLowerCase()}
              className="inline-flex items-center justify-center rounded-full bg-rose-500 text-white px-4 py-2 text-xs font-medium hover:bg-rose-500/90 disabled:opacity-40 transition"
            >
              {pending ? "Deleting…" : "Delete forever"}
            </button>
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                setConfirmEmail("");
                setError(null);
              }}
              disabled={pending}
              className="text-xs text-white/50 hover:text-white/80"
            >
              Cancel
            </button>
          </div>
          {error && <div className="text-xs text-rose-400">{error}</div>}
        </div>
      )}
    </section>
  );
}
