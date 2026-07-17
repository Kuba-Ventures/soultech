"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EXTRACTION_PROMPT } from "@/lib/profile/v1/extractionPrompt";
import {
  wizardFinish,
  wizardKnowledge,
  wizardPasteImport,
  wizardUploadDoc,
  type WizardKnowledge,
} from "@/app/welcome/actions";
import { BrandIcon } from "@/components/ui/BrandIcon";
import { LearnedDonut } from "@/components/app/LearnedDonut";

type Props = { initialCount: number };

const STEPS = ["Welcome", "Paste", "Sources", "Connect", "Done"] as const;

// Kinds of documents worth uploading — shown as examples on the sources step.
const UPLOAD_EXAMPLES = [
  "Memos",
  "Writing samples",
  "Work portfolio",
  "Cover letters",
  "Journal entries",
  "Meeting notes",
  "Essays",
  "Slack exports",
];

// Connector tiles are visual-only for now — real OAuth isn't built yet.
// `brand` keys map to real logos via BrandIcon (simple-icons).
//
// Doc sources feed the profile directly (your writing → text → profile), so
// they live on the Sources step next to file upload. Other tools go on the
// following step.
const DOC_SOURCES = [
  { name: "Google Drive", brand: "googledrive" },
  { name: "Gmail", brand: "gmail" },
  { name: "Notion", brand: "notion" },
];
const OTHER_CONNECTORS = [
  { name: "Spotify", brand: "spotify" },
  { name: "Raycast", brand: "raycast" },
  { name: "Google Calendar", brand: "googlecalendar" },
  { name: "LinkedIn", brand: "linkedin" },
];

export function OnboardingWizard({ initialCount }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(initialCount > 0);
  const [raw, setRaw] = useState("");
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [knowledge, setKnowledge] = useState<WizardKnowledge | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // On the "Done" step, the background import is still landing, so poll the
  // Learned % a few times and let the number climb as items come in.
  useEffect(() => {
    if (step !== STEPS.length - 1 || !submitted) return;
    let cancelled = false;
    let attempts = 0;
    const MAX_POLLS = 8;
    const fetchOnce = async () => {
      const k = await wizardKnowledge();
      if (!cancelled) setKnowledge(k);
    };
    fetchOnce();
    const id = setInterval(() => {
      attempts += 1;
      if (attempts >= MAX_POLLS) {
        clearInterval(id);
        return;
      }
      fetchOnce();
    }, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [step, submitted]);

  function goDashboard() {
    setError(null);
    startTransition(async () => {
      await wizardFinish(); // best-effort; navigate regardless
      router.push("/profile");
    });
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

  function importPaste() {
    setError(null);
    setNote(null);
    startTransition(async () => {
      const r = await wizardPasteImport({ rawExport: raw });
      if (r.ok) {
        setSubmitted(true);
        setRaw("");
        setNote("Reading it in the background. Keep going, it'll be in your profile shortly.");
      } else setError(r.error);
    });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    if (fileRef.current) fileRef.current.value = "";
    setError(null);
    setNote(null);
    startTransition(async () => {
      const r = await wizardUploadDoc(fd);
      if (r.ok) {
        setSubmitted(true);
        setNote(`Reading ${file.name} in the background. Keep going.`);
      } else setError(r.error);
    });
  }

  const next = () => {
    setNote(null);
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => {
    setNote(null);
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const btn =
    "rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";
  const primary = `${btn} bg-[var(--amber)] text-black enabled:hover:bg-[var(--amber-soft)]`;
  const ghost = `${btn} border border-[var(--line-2)] text-[var(--t-dim)] hover:text-[var(--text)]`;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-10">
      {/* Progress + skip */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                i <= step ? "w-8 bg-[var(--amber)]" : "w-4 bg-[var(--line-2)]"
              }`}
            />
          ))}
        </div>
        <button type="button" onClick={goDashboard} className="text-xs text-[var(--t-faint)] hover:text-[var(--t-dim)]">
          Skip for now →
        </button>
      </div>

      <div className="flex-1">
        {step === 0 && (
          <div className="animate-fade-up">
            <h1 className="font-display text-3xl text-[var(--text)]">
              Let&apos;s set up your profile
            </h1>
            <p className="mt-3 max-w-xl text-[var(--t-dim)]">
              Soultech works by learning how you communicate, think, and learn, then
              putting that behind every answer. Let&apos;s teach it about you. It takes a
              couple of minutes, and you can skip any step.
            </p>
            <ol className="mt-6 space-y-2 text-sm text-[var(--t-dim)]">
              <li>1 · Paste a self-portrait your existing AI writes</li>
              <li>2 · Upload docs you&apos;ve written (optional)</li>
              <li>3 · Connect your tools (coming soon)</li>
            </ol>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-up">
            <h2 className="font-display text-2xl text-[var(--text)]">Paste a self-portrait</h2>
            <p className="mt-2 text-sm text-[var(--t-dim)]">
              Copy this prompt into your ChatGPT or Claude, then paste what it gives you back.
            </p>
            <button type="button" onClick={copyPrompt} className={`${ghost} mt-4`}>
              {copied ? "Copied ✓" : "Copy the prompt"}
            </button>
            <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--line)] bg-black/20 p-4 font-mono text-xs leading-relaxed text-[var(--t-dim)]">
              {EXTRACTION_PROMPT}
            </pre>
            <p className="mt-4 text-sm text-[var(--t-dim)]">Then paste the result below.</p>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={9}
              placeholder="Paste the export here…"
              className="mt-4 w-full resize-y rounded-lg border border-[var(--line)] bg-black/20 p-4 font-mono text-sm text-[var(--text)] placeholder:text-[var(--t-faint)] focus:outline-none"
            />
            <button
              type="button"
              onClick={importPaste}
              disabled={pending || raw.trim().length === 0}
              className={`${primary} mt-3`}
            >
              {pending ? "Reading…" : "Add to my profile"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-up">
            <h2 className="font-display text-2xl text-[var(--text)]">Add your sources</h2>
            <p className="mt-2 text-sm text-[var(--t-dim)]">
              Bring in things you&apos;ve written so Soultech reads how you write and
              reason. Upload files, or connect where your writing already lives.
            </p>

            <div className="mt-5 text-xs uppercase tracking-wide text-[var(--t-faint)]">
              Upload files
            </div>
            <p className="mt-1 text-sm text-[var(--t-dim)]">.txt, .md, or .pdf</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {UPLOAD_EXAMPLES.map((ex) => (
                <span
                  key={ex}
                  className="rounded-full border border-[var(--line-2)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--t-dim)]"
                >
                  {ex}
                </span>
              ))}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.markdown,.pdf"
              onChange={onFile}
              disabled={pending}
              className="mt-3 block w-full text-sm text-[var(--t-dim)] file:mr-4 file:rounded-lg file:border file:border-[var(--line-2)] file:bg-[var(--surface-2)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--text)] hover:file:bg-white/10"
            />

            <div className="mt-6 text-xs uppercase tracking-wide text-[var(--t-faint)]">
              Connect &amp; pull
            </div>
            <p className="mt-1 text-sm text-[var(--t-dim)]">
              Pull your docs straight from where they live. Connecting is coming soon; for
              now, upload or paste.
            </p>
            <ConnectorTiles list={DOC_SOURCES} />
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-up">
            <h2 className="font-display text-2xl text-[var(--text)]">Connect your tools</h2>
            <p className="mt-2 text-sm text-[var(--t-dim)]">
              Soon you&apos;ll connect these so Soultech keeps learning as you work. Not
              available yet, but skip ahead and you can connect later.
            </p>
            <ConnectorTiles list={OTHER_CONNECTORS} />
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-up">
            <h2 className="font-display text-3xl text-[var(--text)]">You&apos;re set up</h2>
            <p className="mt-3 max-w-xl text-[var(--t-dim)]">
              {submitted
                ? "Soultech is reading what you shared and building your profile now. Here's where that stands, and it'll keep filling in as you head to your dashboard."
                : "You skipped the inputs, and that's fine. You can build your profile anytime, from the Sources screen on your dashboard."}
            </p>

            {submitted && knowledge && knowledge.percent > 0 && (
              <div className="mt-6 max-w-md rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-4">
                <span className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-[var(--t-faint)]">
                  Learned
                </span>
                <LearnedDonut percent={knowledge.percent} segments={knowledge.segments} />
                {knowledge.suggestions.length > 0 && (
                  <div className="mt-3.5">
                    <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--t-faint)]">
                      To learn more
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {knowledge.suggestions.slice(0, 2).map((s) => (
                        <li key={s.label} className="text-sm text-[var(--t-dim)]">
                          {s.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {note && <p className="mt-4 text-sm text-[var(--ok)]">{note}</p>}
        {error && <p className="mt-4 text-sm text-[#e08a8a]">{error}</p>}
      </div>

      {/* Footer nav */}
      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          {step > 0 && step < STEPS.length - 1 && (
            <button type="button" onClick={back} className={ghost}>
              Back
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {submitted && (
            <span className="font-mono text-xs text-[var(--t-faint)]">reading…</span>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className={primary}>
              {step === 0 ? "Get started" : "Next"}
            </button>
          ) : (
            <button
              type="button"
              onClick={goDashboard}
              disabled={pending}
              className={primary}
            >
              Go to my dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Visual connector tiles (real OAuth is a follow-up). Used on the Sources step
// for doc sources and on the Connect step for other tools.
function ConnectorTiles({ list }: { list: { name: string; brand: string }[] }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {list.map((c) => (
        <div
          key={c.name}
          aria-disabled
          className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--t-dim)] opacity-70"
        >
          <span className="flex items-center gap-2.5">
            <span className="text-[var(--text)]">
              <BrandIcon brand={c.brand} size={18} fallback={c.name[0]} />
            </span>
            {c.name}
          </span>
          <span className="rounded-full border border-[var(--line-2)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--t-faint)]">
            Soon
          </span>
        </div>
      ))}
    </div>
  );
}
