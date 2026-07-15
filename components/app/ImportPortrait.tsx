"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { EXTRACTION_PROMPT } from "@/lib/profile/v1/extractionPrompt";
import { importPortraitAction } from "@/app/(app)/import/actions";
import type { Profile } from "@/lib/profile/v1/types";

type Props = {
  /** Existing profile, if the member has already imported one. */
  initialProfile: Profile | null;
};

export function ImportPortrait({ initialProfile }: Props) {
  const [raw, setRaw] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [filtered, setFiltered] = useState(0);
  const [pending, startTransition] = useTransition();

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(EXTRACTION_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn't copy automatically. Select the prompt below and copy it manually.");
    }
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await importPortraitAction({ rawExport: raw });
      if (result.ok) {
        setProfile(result.profile);
        setFiltered(result.filtered);
        setRaw("");
      } else {
        setError(result.error);
      }
    });
  }

  const card =
    "rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-6";

  return (
    <div className="flex flex-col gap-6">
      {/* Step 1 — copy the extraction prompt */}
      <div className={card}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-display text-lg text-[var(--text)]">
              1 · Copy this prompt
            </div>
            <p className="mt-1 max-w-xl text-sm text-[var(--t-dim)]">
              Paste it into your existing ChatGPT or Claude. It writes a portrait of how
              you communicate, think, and learn. Bring that back here in the next step.
            </p>
          </div>
          <button
            type="button"
            onClick={copyPrompt}
            className="shrink-0 rounded-lg border border-[var(--line-2)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-white/10"
          >
            {copied ? "Copied ✓" : "Copy this prompt"}
          </button>
        </div>
        <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--line)] bg-black/20 p-4 font-mono text-xs leading-relaxed text-[var(--t-dim)]">
          {EXTRACTION_PROMPT}
        </pre>
      </div>

      {/* Step 2 — paste the export back */}
      <div className={card}>
        <div className="font-display text-lg text-[var(--text)]">
          2 · Paste what it gives you back
        </div>
        <p className="mt-1 text-sm text-[var(--t-dim)]">
          Paste the whole export. Soultech reads it into a structured profile you own,
          edit, and can delete. It&apos;s encrypted, isolated to your account, and never
          used to train anyone else&apos;s model.
        </p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste your export here…"
          rows={12}
          className="mt-4 w-full resize-y rounded-lg border border-[var(--line)] bg-black/20 p-4 font-mono text-sm text-[var(--text)] placeholder:text-[var(--t-faint)] focus:outline-none"
        />
        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            onClick={submit}
            disabled={pending || raw.trim().length === 0}
            className="rounded-lg bg-[var(--amber)] px-5 py-2 text-sm font-semibold text-black transition enabled:hover:bg-[var(--amber-soft)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Reading your export…" : "Import profile"}
          </button>
          {error && <span className="text-sm text-[#e08a8a]">{error}</span>}
        </div>
      </div>

      {/* Result — confirmation + hand-off to the profile hub. */}
      {profile && (
        <div className={card}>
          <div className="flex items-baseline justify-between gap-4">
            <div className="font-display text-lg text-[var(--text)]">
              Imported {profile.items.length} item{profile.items.length === 1 ? "" : "s"}
            </div>
            <div className="font-mono text-xs text-[var(--t-faint)]">
              saved {new Date(profile.updatedAt).toLocaleString()}
            </div>
          </div>
          <p className="mt-1 text-sm text-[var(--t-dim)]">
            Soultech read your export into the ten-category model of who you are. Review,
            edit, or delete any of it from your profile.
          </p>
          {filtered > 0 && (
            <p className="mt-2 text-sm text-[var(--t-faint)]">
              Left out {filtered} item{filtered === 1 ? "" : "s"} with sensitive details
              (health, financial, or location). Soultech doesn&apos;t store those.
            </p>
          )}
          <Link
            href="/profile"
            className="mt-4 inline-flex rounded-lg bg-[var(--amber)] px-5 py-2 text-sm font-semibold text-black transition hover:bg-[var(--amber-soft)]"
          >
            Review your profile
          </Link>
          <details className="mt-4">
            <summary className="cursor-pointer font-mono text-xs text-[var(--t-faint)] hover:text-[var(--t-dim)]">
              View raw data
            </summary>
            <pre className="mt-2 max-h-[28rem] overflow-auto rounded-lg border border-[var(--line)] bg-black/30 p-4 font-mono text-xs leading-relaxed text-[var(--cool-soft)]">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
