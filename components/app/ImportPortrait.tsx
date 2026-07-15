"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { EXTRACTION_PROMPT } from "@/lib/profile/v1/extractionPrompt";
import { importPortraitAction } from "@/app/(app)/import/actions";
import { BrandIcon } from "@/components/ui/BrandIcon";
import type { Profile } from "@/lib/profile/v1/types";

type Props = {
  /** Existing profile, if the member has already imported one. */
  initialProfile: Profile | null;
};

// Connections are a follow-up; shown here so Sources reads as the full hub.
// `how` reflects reality: some services use a pasteable API key, others OAuth.
const CONNECTIONS = [
  { name: "Google Drive", brand: "googledrive", how: "Sign in" },
  { name: "Gmail", brand: "gmail", how: "Sign in" },
  { name: "Notion", brand: "notion", how: "API key" },
  { name: "Spotify", brand: "spotify", how: "Sign in" },
  { name: "Claude", brand: "claude", how: "API key" },
  { name: "ChatGPT", brand: "chatgpt", how: "API key" },
];

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
      {/* Section: import from your AI */}
      <div className={card}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-display text-lg text-[var(--text)]">Import from your AI</div>
            <p className="mt-1 max-w-xl text-sm text-[var(--t-dim)]">
              Copy this prompt into your ChatGPT or Claude, then paste what it gives back.
              Soultech reads it into your profile: yours to edit or delete, encrypted, and
              never used to train anyone else&apos;s model.
            </p>
          </div>
          <button
            type="button"
            onClick={copyPrompt}
            className="shrink-0 rounded-lg border border-[var(--line-2)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-white/10"
          >
            {copied ? "Copied ✓" : "Copy the prompt"}
          </button>
        </div>
        <pre className="mt-4 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--line)] bg-black/20 p-4 font-mono text-xs leading-relaxed text-[var(--t-dim)]">
          {EXTRACTION_PROMPT}
        </pre>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste what your AI gives back here…"
          rows={9}
          className="mt-4 w-full resize-y rounded-lg border border-[var(--line)] bg-black/20 p-4 font-mono text-sm text-[var(--text)] placeholder:text-[var(--t-faint)] focus:outline-none"
        />
        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            onClick={submit}
            disabled={pending || raw.trim().length === 0}
            className="rounded-lg bg-[var(--amber)] px-5 py-2 text-sm font-semibold text-black transition enabled:hover:bg-[var(--amber-soft)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Reading your export…" : "Add to my profile"}
          </button>
          {error && <span className="text-sm text-[#e08a8a]">{error}</span>}
        </div>
      </div>

      {/* Result — confirmation + hand-off to the profile. */}
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
            Soultech read your export into your profile. Review, edit, or delete any of it
            from your profile.
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
        </div>
      )}

      {/* Section: connections (follow-up) */}
      <div className={card}>
        <div className="font-display text-lg text-[var(--text)]">Connections</div>
        <p className="mt-1 max-w-xl text-sm text-[var(--t-dim)]">
          Pull straight from the tools where your writing and taste already live. Coming
          soon; for now, import from your AI above.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CONNECTIONS.map((c) => (
            <div
              key={c.name}
              aria-disabled
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--t-dim)] opacity-70"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="text-[var(--text)]">
                  <BrandIcon brand={c.brand} size={18} fallback={c.name[0]} />
                </span>
                <span className="truncate">{c.name}</span>
              </span>
              <span className="shrink-0 rounded-full border border-[var(--line-2)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--t-faint)]">
                Soon
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
