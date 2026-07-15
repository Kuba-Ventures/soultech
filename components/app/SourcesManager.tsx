"use client";

import { useRef, useState, useTransition } from "react";
import { EXTRACTION_PROMPT } from "@/lib/profile/v1/extractionPrompt";
import {
  addCustomSource,
  connectNotionAction,
  disconnectNotionAction,
  importProviderPaste,
  pullNotionAction,
  removeSourceAction,
  uploadFileSource,
  type SourceWithCount,
} from "@/app/(app)/import/actions";
import { BrandIcon } from "@/components/ui/BrandIcon";

type Props = {
  initialSources: SourceWithCount[];
  notionEnabled: boolean;
  notionConnected: boolean;
  storesFiles: boolean;
};

type PanelKey = "claude" | "chatgpt" | "custom" | "notion";

const card =
  "rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-6";
const tile =
  "flex items-center gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--text)] transition";

const SOON = [
  { name: "Google Drive", brand: "googledrive" },
  { name: "Gmail", brand: "gmail" },
  { name: "Spotify", brand: "spotify" },
];

export function SourcesManager({
  initialSources,
  notionEnabled,
  notionConnected,
  storesFiles,
}: Props) {
  const [sources, setSources] = useState(initialSources);
  const [connected, setConnected] = useState(notionConnected);
  const [panel, setPanel] = useState<PanelKey | null>(null);
  const [paste, setPaste] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [customText, setCustomText] = useState("");
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setError(null);
    setNote(null);
  }

  function addedNote(added: number, filtered: number) {
    const bits = [`Added ${added} item${added === 1 ? "" : "s"}`];
    if (filtered > 0) bits.push(`left out ${filtered} sensitive`);
    setNote(`${bits.join(", ")}. See them on your profile.`);
  }

  function togglePanel(key: PanelKey) {
    reset();
    setPanel((p) => (p === key ? null : key));
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(EXTRACTION_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn't copy automatically. Select the prompt and copy it manually.");
    }
  }

  function submitPaste(provider: "claude" | "chatgpt") {
    reset();
    startTransition(async () => {
      const r = await importProviderPaste({ provider, rawExport: paste });
      if (r.ok) {
        setSources(r.sources);
        setPaste("");
        setPanel(null);
        addedNote(r.added, r.filtered);
      } else setError(r.error);
    });
  }

  function submitCustom() {
    reset();
    startTransition(async () => {
      const r = await addCustomSource({ label: customLabel, rawText: customText });
      if (r.ok) {
        setSources(r.sources);
        setCustomLabel("");
        setCustomText("");
        setPanel(null);
        addedNote(r.added, r.filtered);
      } else setError(r.error);
    });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    reset();
    const data = new FormData();
    data.set("file", file);
    if (fileRef.current) fileRef.current.value = "";
    startTransition(async () => {
      const r = await uploadFileSource(data);
      if (r.ok) {
        setSources(r.sources);
        addedNote(r.added, r.filtered);
      } else setError(r.error);
    });
  }

  function connectNotion() {
    reset();
    startTransition(async () => {
      const r = await connectNotionAction({ token });
      if (r.ok) {
        setSources(r.sources);
        setConnected(true);
        setToken("");
        setPanel(null);
        setNote("Connected. Reading your pages into your profile now.");
      } else setError(r.error);
    });
  }

  function pullNotion() {
    reset();
    startTransition(async () => {
      const r = await pullNotionAction();
      if (r.ok) {
        setSources(r.sources);
        setNote("Refreshing from Notion now.");
      } else setError(r.error);
    });
  }

  function disconnectNotion() {
    reset();
    startTransition(async () => {
      const r = await disconnectNotionAction();
      if (r.ok) {
        setSources(r.sources);
        setConnected(false);
        setNote("Disconnected. What it already added stays until you remove it below.");
      } else setError(r.error);
    });
  }

  function remove(sourceId: string) {
    reset();
    startTransition(async () => {
      const r = await removeSourceAction({ sourceId });
      if (r.ok) {
        setSources(r.sources);
        setConfirmId(null);
        setNote(
          r.removedItems > 0
            ? `Removed the source and ${r.removedItems} item${r.removedItems === 1 ? "" : "s"} it added.`
            : "Removed the source.",
        );
      } else setError(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Add a source */}
      <div className={card}>
        <div className="font-display text-lg text-[var(--text)]">Add a source</div>
        <p className="mt-1 max-w-xl text-sm text-[var(--t-dim)]">
          Bring in what Soultech should learn from. Sensitive details (health, financial,
          location) are left out automatically.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <button type="button" onClick={() => togglePanel("claude")} className={`${tile} hover:bg-white/5 ${panel === "claude" ? "border-[var(--amber)]" : ""}`}>
            <BrandIcon brand="claude" size={18} fallback="C" />
            <span className="truncate">Import from Claude</span>
          </button>
          <button type="button" onClick={() => togglePanel("chatgpt")} className={`${tile} hover:bg-white/5 ${panel === "chatgpt" ? "border-[var(--amber)]" : ""}`}>
            <BrandIcon brand="chatgpt" size={18} fallback="G" />
            <span className="truncate">Import from ChatGPT</span>
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className={`${tile} hover:bg-white/5`}>
            <DocIcon />
            <span className="truncate">Upload a file</span>
          </button>
          <button
            type="button"
            onClick={() => notionEnabled && togglePanel("notion")}
            aria-disabled={!notionEnabled}
            className={`${tile} ${notionEnabled ? "hover:bg-white/5" : "opacity-70"} ${panel === "notion" ? "border-[var(--amber)]" : ""}`}
          >
            <BrandIcon brand="notion" size={18} fallback="N" />
            <span className="truncate">{connected ? "Notion · connected" : "Connect Notion"}</span>
            {!notionEnabled && <SoonTag />}
          </button>
          <button type="button" onClick={() => togglePanel("custom")} className={`${tile} hover:bg-white/5 ${panel === "custom" ? "border-[var(--amber)]" : ""}`}>
            <PlusIcon />
            <span className="truncate">Add custom</span>
          </button>
          {SOON.map((s) => (
            <div key={s.name} aria-disabled className={`${tile} opacity-70`}>
              <span className="text-[var(--text)]">
                <BrandIcon brand={s.brand} size={18} fallback={s.name[0]} />
              </span>
              <span className="truncate text-[var(--t-dim)]">{s.name}</span>
              <SoonTag />
            </div>
          ))}
        </div>

        <input ref={fileRef} type="file" accept=".txt,.md,.pdf" onChange={onFile} className="hidden" />

        {/* Inline panels */}
        {(panel === "claude" || panel === "chatgpt") && (
          <PastePanel
            provider={panel}
            value={paste}
            onChange={setPaste}
            onCopy={copyPrompt}
            copied={copied}
            onSubmit={() => submitPaste(panel)}
            pending={pending}
          />
        )}
        {panel === "custom" && (
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-black/15 p-4">
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Name this source (e.g. My writing samples)"
              className="w-full rounded-md border border-[var(--line)] bg-black/30 p-2 text-sm text-[var(--text)] placeholder:text-[var(--t-faint)] focus:outline-none"
            />
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Paste the text for this source…"
              rows={6}
              className="mt-2 w-full resize-y rounded-md border border-[var(--line)] bg-black/30 p-2 font-mono text-sm text-[var(--text)] placeholder:text-[var(--t-faint)] focus:outline-none"
            />
            <button
              type="button"
              onClick={submitCustom}
              disabled={pending || !customLabel.trim() || !customText.trim()}
              className="mt-3 rounded-md bg-[var(--amber)] px-4 py-1.5 text-xs font-semibold text-black transition enabled:hover:bg-[var(--amber-soft)] disabled:opacity-40"
            >
              {pending ? "Reading…" : "Add source"}
            </button>
          </div>
        )}
        {panel === "notion" && !connected && (
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-black/15 p-4">
            <p className="text-xs leading-relaxed text-[var(--t-dim)]">
              In Notion, create an internal integration at{" "}
              <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" className="text-[var(--cool-soft)] underline">
                notion.so/my-integrations
              </a>
              , share the pages you want Soultech to read with it, then paste the token.
            </p>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ntn_… or secret_…"
              autoComplete="off"
              className="mt-2 w-full rounded-md border border-[var(--line)] bg-black/30 p-2 font-mono text-sm text-[var(--text)] placeholder:text-[var(--t-faint)] focus:outline-none"
            />
            <button
              type="button"
              onClick={connectNotion}
              disabled={pending || !token.trim()}
              className="mt-3 rounded-md bg-[var(--amber)] px-4 py-1.5 text-xs font-semibold text-black transition enabled:hover:bg-[var(--amber-soft)] disabled:opacity-40"
            >
              {pending ? "Connecting…" : "Connect Notion"}
            </button>
          </div>
        )}

        {connected && (
          <div className="mt-4 flex items-center gap-3 text-xs">
            <span className="text-[var(--cool-soft)]">Notion connected</span>
            <button type="button" onClick={pullNotion} disabled={pending} className="rounded-md border border-[var(--line-2)] px-2.5 py-1 text-[var(--text)] transition hover:bg-white/10 disabled:opacity-40">
              Pull again
            </button>
            <button type="button" onClick={disconnectNotion} disabled={pending} className="text-[var(--t-faint)] transition hover:text-[#e08a8a] disabled:opacity-40">
              Disconnect
            </button>
          </div>
        )}

        {(note || error) && (
          <p className={`mt-4 text-sm ${error ? "text-[#e08a8a]" : "text-[var(--t-faint)]"}`}>
            {error ?? note}
          </p>
        )}
        {!storesFiles && (
          <p className="mt-2 text-xs text-[var(--t-faint)]">
            Uploaded files are read for your profile but not retained until file storage is
            turned on.
          </p>
        )}
      </div>

      {/* Your sources */}
      <div className={card}>
        <div className="font-display text-lg text-[var(--text)]">Your sources</div>
        {sources.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--t-faint)]">
            Nothing yet. Add a source above and it shows up here, with what it taught
            Soultech and a way to remove it.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {sources.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-black/10 px-3 py-2.5">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md border border-[var(--line-2)] text-[var(--text)]">
                  <SourceIcon provider={s.provider} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-[var(--text)]">{s.label}</span>
                    <span className="shrink-0 rounded-full border border-[var(--line-2)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--t-faint)]">
                      {kindLabel(s.kind)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--t-faint)]">
                    <span>
                      {s.itemCount} item{s.itemCount === 1 ? "" : "s"}
                    </span>
                    <span>·</span>
                    <span>{new Date(s.addedAt).toLocaleDateString()}</span>
                    {s.fileUrl && (
                      <>
                        <span>·</span>
                        <a href={s.fileUrl} target="_blank" rel="noreferrer" className="text-[var(--cool-soft)] underline">
                          Download
                        </a>
                      </>
                    )}
                  </div>
                </div>
                {confirmId === s.id ? (
                  <span className="flex shrink-0 items-center gap-2 text-xs">
                    <button type="button" onClick={() => remove(s.id)} disabled={pending} className="rounded-md bg-[#b34747] px-2.5 py-1 font-semibold text-white disabled:opacity-40">
                      Remove
                    </button>
                    <button type="button" onClick={() => setConfirmId(null)} className="text-[var(--t-faint)] hover:text-[var(--text)]">
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      setConfirmId(s.id);
                    }}
                    className="shrink-0 text-xs text-[var(--t-faint)] transition hover:text-[#e08a8a]"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PastePanel({
  provider,
  value,
  onChange,
  onCopy,
  copied,
  onSubmit,
  pending,
}: {
  provider: "claude" | "chatgpt";
  value: string;
  onChange: (v: string) => void;
  onCopy: () => void;
  copied: boolean;
  onSubmit: () => void;
  pending: boolean;
}) {
  const name = provider === "claude" ? "Claude" : "ChatGPT";
  return (
    <div className="mt-4 rounded-lg border border-[var(--line)] bg-black/15 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[var(--t-dim)]">
          Copy this prompt into {name}, then paste what it gives back.
        </p>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-md border border-[var(--line-2)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:bg-white/10"
        >
          {copied ? "Copied ✓" : "Copy the prompt"}
        </button>
      </div>
      <pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap rounded-md border border-[var(--line)] bg-black/20 p-3 font-mono text-xs leading-relaxed text-[var(--t-dim)]">
        {EXTRACTION_PROMPT}
      </pre>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Paste what ${name} gives back here…`}
        rows={8}
        className="mt-3 w-full resize-y rounded-md border border-[var(--line)] bg-black/30 p-3 font-mono text-sm text-[var(--text)] placeholder:text-[var(--t-faint)] focus:outline-none"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={pending || value.trim().length === 0}
        className="mt-3 rounded-md bg-[var(--amber)] px-4 py-1.5 text-xs font-semibold text-black transition enabled:hover:bg-[var(--amber-soft)] disabled:opacity-40"
      >
        {pending ? "Reading your export…" : "Add to my profile"}
      </button>
    </div>
  );
}

function SourceIcon({ provider }: { provider: string }) {
  if (provider === "file") return <DocIcon />;
  if (provider === "custom") return <PlusIcon />;
  return <BrandIcon brand={provider} size={18} fallback={provider[0]?.toUpperCase() ?? "?"} />;
}

function kindLabel(kind: SourceWithCount["kind"]): string {
  switch (kind) {
    case "ai":
      return "AI";
    case "upload":
      return "File";
    case "custom":
      return "Custom";
    case "connection":
      return "Connected";
  }
}

function SoonTag() {
  return (
    <span className="ml-auto shrink-0 rounded-full border border-[var(--line-2)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--t-faint)]">
      Soon
    </span>
  );
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v4h4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
