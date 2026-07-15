"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { EXTRACTION_PROMPT } from "@/lib/profile/v1/extractionPrompt";
import {
  connectNotionAction,
  disconnectNotionAction,
  importPortraitAction,
  pullNotionAction,
} from "@/app/(app)/import/actions";
import { BrandIcon } from "@/components/ui/BrandIcon";
import type { ConnectionStatus } from "@/lib/connections/store";
import type { Profile } from "@/lib/profile/v1/types";

type Props = {
  /** Existing profile, if the member has already imported one. */
  initialProfile: Profile | null;
  /** Whether the server is configured to accept connection secrets. */
  notionEnabled: boolean;
  notion: ConnectionStatus;
};

// Services shown as coming-soon in the Connections section (Notion is handled
// separately as a live connect flow below).
const SOON = [
  { name: "Google Drive", brand: "googledrive" },
  { name: "Gmail", brand: "gmail" },
  { name: "Spotify", brand: "spotify" },
  { name: "Claude", brand: "claude" },
  { name: "ChatGPT", brand: "chatgpt" },
];

export function ImportPortrait({ initialProfile, notionEnabled, notion }: Props) {
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

      {/* Section: connections */}
      <div className={card}>
        <div className="font-display text-lg text-[var(--text)]">Connections</div>
        <p className="mt-1 max-w-xl text-sm text-[var(--t-dim)]">
          Pull straight from the tools where your writing and taste already live. Your keys
          are encrypted, used only to read for your profile, and deletable anytime.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <NotionConnection enabled={notionEnabled} status={notion} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SOON.map((c) => (
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
    </div>
  );
}

/** Live Notion connect flow: paste an integration token, we pull shared pages. */
function NotionConnection({
  enabled,
  status,
}: {
  enabled: boolean;
  status: ConnectionStatus;
}) {
  const [connected, setConnected] = useState(status.connected);
  const [workspace, setWorkspace] = useState(status.workspace);
  const [opening, setOpening] = useState(false);
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shell =
    "flex flex-col gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3";

  function connect() {
    setMsg(null);
    startTransition(async () => {
      const r = await connectNotionAction({ token });
      if (r.ok) {
        setConnected(true);
        setWorkspace(undefined);
        setToken("");
        setOpening(false);
        setNote("Connected. Reading your pages into your profile now.");
      } else {
        setMsg(r.error);
      }
    });
  }

  function pull() {
    setNote(null);
    startTransition(async () => {
      const r = await pullNotionAction();
      setNote(r.ok ? "Refreshing from Notion now." : r.error);
    });
  }

  function disconnect() {
    startTransition(async () => {
      const r = await disconnectNotionAction();
      if (r.ok) {
        setConnected(false);
        setNote(null);
      } else {
        setMsg(r.error);
      }
    });
  }

  const header = (
    <span className="flex min-w-0 items-center gap-2.5 text-sm text-[var(--text)]">
      <BrandIcon brand="notion" size={18} fallback="N" />
      <span className="truncate">Notion</span>
    </span>
  );

  // Not configured server-side: show as coming-soon, same as the others.
  if (!enabled) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-3 opacity-70">
        {header}
        <span className="shrink-0 rounded-full border border-[var(--line-2)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--t-faint)]">
          Soon
        </span>
      </div>
    );
  }

  if (connected) {
    return (
      <div className={shell}>
        <div className="flex items-center justify-between gap-3">
          {header}
          <div className="flex shrink-0 items-center gap-3 text-xs">
            <span className="text-[var(--cool-soft)]">
              Connected{workspace ? ` · ${workspace}` : ""}
            </span>
            <button
              type="button"
              onClick={pull}
              disabled={pending}
              className="rounded-md border border-[var(--line-2)] px-2.5 py-1 text-[var(--text)] transition hover:bg-white/10 disabled:opacity-40"
            >
              Pull again
            </button>
            <button
              type="button"
              onClick={disconnect}
              disabled={pending}
              className="text-[var(--t-faint)] transition hover:text-[#e08a8a] disabled:opacity-40"
            >
              Disconnect
            </button>
          </div>
        </div>
        {note && <p className="text-xs text-[var(--t-faint)]">{note}</p>}
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className="flex items-center justify-between gap-3">
        {header}
        <button
          type="button"
          onClick={() => setOpening((o) => !o)}
          className="shrink-0 rounded-md border border-[var(--line-2)] bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--text)] transition hover:bg-white/10"
        >
          {opening ? "Cancel" : "Connect"}
        </button>
      </div>

      {opening && (
        <div className="mt-1 flex flex-col gap-2">
          <p className="text-xs leading-relaxed text-[var(--t-dim)]">
            In Notion, create an internal integration at{" "}
            <a
              href="https://www.notion.so/my-integrations"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--cool-soft)] underline"
            >
              notion.so/my-integrations
            </a>
            , share the pages you want Soultech to read with it, then paste the integration
            token here.
          </p>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ntn_… or secret_…"
            autoComplete="off"
            className="w-full rounded-md border border-[var(--line)] bg-black/30 p-2 font-mono text-sm text-[var(--text)] placeholder:text-[var(--t-faint)] focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={connect}
              disabled={pending || token.trim().length === 0}
              className="rounded-md bg-[var(--amber)] px-4 py-1.5 text-xs font-semibold text-black transition enabled:hover:bg-[var(--amber-soft)] disabled:opacity-40"
            >
              {pending ? "Connecting…" : "Connect Notion"}
            </button>
            {msg && <span className="text-xs text-[#e08a8a]">{msg}</span>}
          </div>
        </div>
      )}
      {note && <p className="text-xs text-[var(--t-faint)]">{note}</p>}
    </div>
  );
}
