"use client";

import { useRef, useState, useTransition } from "react";
import { processUpload } from "@/app/portal/upload/actions";
import {
  setConsentAction,
  saveQuestionnaireAction,
} from "@/app/(app)/sources/actions";
import type { SensitiveConsents } from "@/lib/profile/consent";

type Tab = "connect" | "forms" | "upl";

const CONNECTORS = [
  { name: "Google Drive", badge: "D", color: "#5b9bd5", blurb: "Your work, docs, how you organize knowledge.", linked: true },
  { name: "Calendar", badge: "C", color: "#e6705a", blurb: "When you work, rest, and move." },
  { name: "Gmail", badge: "G", color: "#d96a4a", blurb: "How you write and who matters." },
  { name: "Spotify", badge: "S", color: "#5fbd6a", blurb: "Your taste and the moods behind it." },
  { name: "LinkedIn", badge: "L", color: "#6a8fd4", blurb: "Your story and the arc so far." },
  { name: "Letterboxd & Goodreads", badge: "M", color: "#a86fd1", blurb: "Films and books, your inner library." },
];

const SENSITIVE: Array<{ key: keyof SensitiveConsents; name: string; badge: string; color: string; blurb: string }> = [
  { key: "health", name: "Apple Health / Oura", badge: "H", color: "#e84d6b", blurb: "Sleep, energy, your best hours." },
  { key: "financial", name: "Bank / Plaid", badge: "B", color: "#4aa6c9", blurb: "What you value, read from where it goes." },
  { key: "location", name: "Location timeline", badge: "T", color: "#7a8a99", blurb: "Where your life actually happens." },
];

const IDEAS = [
  "A voice memo, talking freely",
  "Old journal entries",
  "Essays you're proud of",
  "Your résumé / CV",
  "Photos that mean something",
  "Saved notes & lists",
];

export function SourcesTabs({
  initialConsents,
  initialAnswers,
}: {
  initialConsents: SensitiveConsents;
  initialAnswers: Record<string, Record<string, string>>;
}) {
  const [tab, setTab] = useState<Tab>("connect");
  return (
    <>
      <div className="tabs rise">
        <button className={`tab${tab === "connect" ? " on" : ""}`} onClick={() => setTab("connect")}>
          Connections
        </button>
        <button className={`tab${tab === "forms" ? " on" : ""}`} onClick={() => setTab("forms")}>
          Questionnaires
        </button>
        <button className={`tab${tab === "upl" ? " on" : ""}`} onClick={() => setTab("upl")}>
          Uploads
        </button>
      </div>

      {tab === "connect" && <Connections initialConsents={initialConsents} />}
      {tab === "forms" && <Questionnaires initialAnswers={initialAnswers} />}
      {tab === "upl" && <Uploads />}
    </>
  );
}

function Connections({ initialConsents }: { initialConsents: SensitiveConsents }) {
  const [linked, setLinked] = useState<Record<string, boolean>>({});
  const [consents, setConsents] = useState<SensitiveConsents>(initialConsents);
  const [, start] = useTransition();

  function toggleConsent(key: keyof SensitiveConsents) {
    const next = !consents[key];
    setConsents((p) => ({ ...p, [key]: next }));
    start(async () => {
      await setConsentAction(key, next);
    });
  }

  return (
    <>
      <div className="conn rise">
        {CONNECTORS.map((c) => {
          const isLinked = c.linked || linked[c.name];
          return (
            <div key={c.name} className={`c${isLinked ? " linked" : ""}`}>
              <div className="top">
                <span className="lg" style={{ background: c.color }}>{c.badge}</span>
                <span className="cn">{c.name}</span>
              </div>
              <span className="te">{c.blurb}</span>
              <span
                className="cta"
                role="button"
                tabIndex={0}
                onClick={() => !isLinked && setLinked((p) => ({ ...p, [c.name]: true }))}
              >
                {isLinked ? "✓ Connected" : "Connect"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="sect" style={{ marginTop: 26 }}>
        Sensitive, off by default<span className="ln" />
      </div>
      <div className="conn rise">
        {SENSITIVE.map((c) => {
          const on = consents[c.key];
          return (
            <div key={c.key} className={`c gated${on ? " consented" : ""}`}>
              <div className="top">
                <span className="lg" style={{ background: c.color }}>{c.badge}</span>
                <span className="cn">{c.name}</span>
                <span className="soon">Consent</span>
              </div>
              <span className="te">{c.blurb}</span>
              <span className="cta" role="button" tabIndex={0} onClick={() => toggleConsent(c.key)}>
                {on ? "✓ Consented · tap to revoke" : "Turn on with consent"}
              </span>
            </div>
          );
        })}
      </div>
      <div className="consent rise">
        These never connect silently. Each asks for explicit, revocable consent,
        stays encrypted, and is locked away from every connected tool until you
        say otherwise.
      </div>
    </>
  );
}

const FORMS = [
  {
    slug: "basics",
    title: "The basics",
    sub: "name, base, what you do",
    fields: [
      { id: "name", label: "Preferred name", type: "text" as const },
      { id: "base", label: "Where are you based?", type: "text" as const },
      { id: "do", label: "What do you do?", type: "text" as const },
    ],
  },
  {
    slug: "learning_style",
    title: "How you learn best",
    sub: "powers your acceleration",
    fields: [
      {
        id: "learn_when",
        label: "You learn fastest when you…",
        type: "pills" as const,
        options: ["Build something", "Read deeply", "Talk it through", "Watch first"],
      },
      {
        id: "sharpest",
        label: "You're sharpest…",
        type: "pills" as const,
        options: ["Early morning", "Afternoon", "Late night"],
      },
    ],
  },
];

function Questionnaires({
  initialAnswers,
}: {
  initialAnswers: Record<string, Record<string, string>>;
}) {
  const [open, setOpen] = useState<string | null>(FORMS[0].slug);
  const [answers, setAnswers] = useState(initialAnswers);
  const [, start] = useTransition();

  function setField(slug: string, id: string, value: string) {
    setAnswers((p) => ({ ...p, [slug]: { ...(p[slug] ?? {}), [id]: value } }));
  }
  function save(slug: string) {
    start(async () => {
      await saveQuestionnaireAction(slug, answers[slug] ?? {});
    });
  }

  return (
    <div className="qlist rise">
      {FORMS.map((f) => {
        const a = answers[f.slug] ?? {};
        const done = f.fields.filter((fl) => a[fl.id]).length;
        const pct = Math.round((done / f.fields.length) * 100);
        const isOpen = open === f.slug;
        return (
          <div className="q" key={f.slug}>
            <div className="qhead" onClick={() => setOpen(isOpen ? null : f.slug)}>
              <div className="qn">
                <div className="qt">{f.title}</div>
                <div className="qs">
                  {pct}% · {f.sub}
                </div>
              </div>
              <div className="qcta">{isOpen ? "Close" : "Continue ›"}</div>
            </div>
            {isOpen && (
              <div className="qbody">
                {f.fields.map((fl) =>
                  fl.type === "text" ? (
                    <div className="field" key={fl.id}>
                      <label>{fl.label}</label>
                      <input
                        value={a[fl.id] ?? ""}
                        onChange={(e) => setField(f.slug, fl.id, e.target.value)}
                        placeholder="Say it plainly"
                      />
                    </div>
                  ) : (
                    <div className="field" key={fl.id}>
                      <label>{fl.label}</label>
                      <div className="pills">
                        {fl.options!.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            className={`pill${a[fl.id] === opt ? " on" : ""}`}
                            onClick={() => setField(f.slug, fl.id, opt)}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ),
                )}
                <div className="save-row">
                  <button type="button" className="btn" onClick={() => save(f.slug)}>
                    Save &amp; continue
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Uploads() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    setStatus(`Processing ${file.name}…`);
    start(async () => {
      const res = await processUpload(fd);
      setStatus(
        res.ok
          ? `Added ${res.memoryCount} memor${res.memoryCount === 1 ? "y" : "ies"} from ${file.name}.`
          : res.error,
      );
    });
    e.target.value = "";
  }

  return (
    <>
      <div
        className="drop rise"
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
      >
        <div className="big">{pending ? "Working…" : "Drop in anything personal"}</div>
        <div className="types">.txt · .md · .pdf · .mp3 · .m4a · .wav · .webm</div>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept=".txt,.md,.pdf,.mp3,.m4a,.wav,.webm"
          onChange={onFile}
        />
      </div>
      {status && <div className="consent rise" style={{ borderColor: "var(--cool)" }}>{status}</div>}

      <div className="sect rise" style={{ marginTop: 24 }}>
        Outside the box →<span className="ln" />
      </div>
      <div className="ideas rise">
        {IDEAS.map((idea) => (
          <div className="idea" key={idea}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="9" />
            </svg>
            {idea}
          </div>
        ))}
      </div>
    </>
  );
}
