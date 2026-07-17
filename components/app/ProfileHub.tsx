"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  SECTIONS,
  primaryCategoryForSection,
  sectionForCategory,
} from "@/lib/profile/v1/types";
import type { Profile, ProfileItem, SectionKey } from "@/lib/profile/v1/types";
import type { LearnedSegment, Suggestion } from "@/lib/profile/v1/knowledge";
import { LearnedDonut } from "@/components/app/LearnedDonut";
import {
  addProfileItem,
  deleteAllProfileData,
  deleteProfileItem,
  updateProfileItem,
} from "@/app/(app)/profile/actions";

// NOTE: the periodic "mirror moment" review would hook in here — same store,
// reuses the mutations below. Not built yet (deferred). Trait chips + portrait
// are display-only for now; making them editable is a small follow-up.

type Knowledge = {
  /** 0..100 — how well Soultech knows the member ("Learned %"). */
  percent: number;
  /** The donut slices behind the number — one per contributing section + breadth. */
  segments: LearnedSegment[];
  /** The still-missing slices — headroom to 100%, for the "Not yet added" group. */
  remaining: LearnedSegment[];
  /** Up to three ways to raise it, thinnest categories first. */
  suggestions: Suggestion[];
};

type Props = {
  initialProfile: Profile | null;
  name: string;
  portrait: string | null;
  traits: string[];
  knowledge: Knowledge;
};

const INTO: SectionKey = "what_youre_into";

export function ProfileHub({ initialProfile, name, portrait, traits, knowledge }: Props) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [addDraft, setAddDraft] = useState("");
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const bySection = useMemo(() => {
    const map = new Map<SectionKey, ProfileItem[]>();
    for (const item of profile?.items ?? []) {
      const key = sectionForCategory(item.category);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [profile]);

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(fn);
  }

  function saveEdit(itemId: string) {
    const content = draft;
    run(async () => {
      const r = await updateProfileItem({ itemId, content });
      if (r.ok) {
        setProfile(r.profile);
        setEditingId(null);
      } else setError(r.error);
    });
  }

  function remove(itemId: string) {
    run(async () => {
      const r = await deleteProfileItem({ itemId });
      if (r.ok) setProfile(r.profile);
      else setError(r.error);
    });
  }

  function addTo(section: SectionKey) {
    const content = addDraft;
    run(async () => {
      const r = await addProfileItem({
        category: primaryCategoryForSection(section),
        content,
      });
      if (r.ok) {
        setProfile(r.profile);
        setAddDraft("");
      } else setError(r.error);
    });
  }

  function wipeAll() {
    run(async () => {
      const r = await deleteAllProfileData();
      if (r.ok) {
        setProfile(null);
        setConfirmWipe(false);
      } else setError(r.error);
    });
  }

  const total = profile?.items.length ?? 0;
  const initial = (name.trim()[0] || "?").toUpperCase();

  if (total === 0) {
    return (
      <div className="mt-4 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-8 text-center">
        <div className="font-display text-xl text-[var(--text)]">Nothing here yet</div>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--t-dim)]">
          Import a self-portrait and Soultech turns it into a picture of how you
          communicate, think, and learn.
        </p>
        <Link
          href="/import"
          className="mt-5 inline-flex rounded-lg bg-[var(--amber)] px-5 py-2 text-sm font-semibold text-black transition hover:bg-[var(--amber-soft)]"
        >
          Import your profile
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[68ch]">
      {/* Hero */}
      <div className="mt-2 flex items-center gap-4">
        <div className="grid h-14 w-14 flex-none place-items-center rounded-2xl border border-[var(--line-2)] bg-[linear-gradient(150deg,color-mix(in_srgb,var(--amber)_26%,transparent),color-mix(in_srgb,var(--cool)_12%,transparent))] font-display text-2xl text-[var(--amber-soft)]">
          {initial}
        </div>
        <div>
          <h1 className="font-display text-2xl text-[var(--text)]">Who you are</h1>
          <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-[var(--t-dim)]">
            {portrait ??
              "Your portrait fills in as Soultech reads what you've shared."}
          </p>
        </div>
      </div>

      {traits.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {traits.map((t) => (
            <span
              key={t}
              className="rounded-full border border-[color:color-mix(in_srgb,var(--cool)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--cool)_9%,transparent)] px-3 py-1 text-xs text-[var(--cool-soft)]"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Learned % — how well Soultech knows you, sliced by what taught it. */}
      <div className="mt-5 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-4">
        <span className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-[var(--t-faint)]">
          Learned
        </span>
        <LearnedDonut
          percent={knowledge.percent}
          segments={knowledge.segments}
          remaining={knowledge.remaining}
        />
        {knowledge.suggestions.length > 0 && (
          <div className="mt-4 border-t border-[var(--line)] pt-3.5">
            <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--t-faint)]">
              To learn more
            </div>
            <ul className="mt-1.5 space-y-1">
              {knowledge.suggestions.map((s) => (
                <li key={s.label}>
                  <Link
                    href={s.href}
                    className="text-sm text-[var(--cool-soft)] transition hover:text-[var(--text)]"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-[var(--t-faint)]">
          {total} thing{total === 1 ? "" : "s"} learned
          {profile && ` · updated ${new Date(profile.updatedAt).toLocaleDateString()}`}
        </span>
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-[#e08a8a]">{error}</span>}
          <Link
            href="/import"
            className="rounded-lg border border-[var(--line-2)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--text)] transition hover:bg-white/10"
          >
            Add more
          </Link>
        </div>
      </div>

      {/* Sections */}
      <div className="mt-6">
        {SECTIONS.map((section, idx) => {
          const items = bySection.get(section.key) ?? [];
          const managing = editingSection === section.key;
          return (
            <div key={section.key}>
              {idx > 0 && <hr className="my-6 border-0 border-t border-[var(--line)]" />}
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-[var(--cool-soft)]">
                  {section.label}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSection(managing ? null : section.key);
                    setEditingId(null);
                    setAddDraft("");
                  }}
                  className="text-[11px] text-[var(--t-faint)] transition hover:text-[var(--text)]"
                >
                  {managing ? "Done" : "Edit"}
                </button>
              </div>

              {/* Read mode */}
              {!managing && items.length > 0 && section.key === INTO && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {items.map((i) => (
                    <span
                      key={i.id}
                      className="rounded-full border border-[var(--line-2)] px-3 py-1 text-[13px] text-[var(--t-dim)]"
                    >
                      {i.content}
                    </span>
                  ))}
                </div>
              )}
              {!managing && items.length > 0 && section.key !== INTO && (
                <p className="mt-2 text-[15px] leading-[1.62] text-[#e7e0d4]">
                  {items.map((i) => i.content).join(" ")}
                </p>
              )}
              {!managing && items.length === 0 && (
                <p className="mt-1 text-sm text-[var(--t-faint)]">
                  Nothing here yet.
                </p>
              )}

              {/* Manage mode */}
              {managing && (
                <div className="mt-3 flex flex-col gap-2">
                  {items.map((item) =>
                    editingId === item.id ? (
                      <div key={item.id} className="rounded-lg border border-[var(--line)] bg-black/20 p-3">
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={2}
                          className="w-full resize-y rounded-md border border-[var(--line)] bg-black/30 p-2 text-sm text-[var(--text)] focus:outline-none"
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => saveEdit(item.id)}
                            className="rounded-md bg-[var(--amber)] px-3 py-1 text-xs font-semibold text-black disabled:opacity-40"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-md border border-[var(--line-2)] px-3 py-1 text-xs text-[var(--t-dim)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 rounded-lg border border-[var(--line)] bg-black/15 px-3 py-2"
                      >
                        <p className="flex-1 text-sm leading-relaxed text-[var(--text)]">{item.content}</p>
                        <span className="mt-0.5 flex shrink-0 gap-2 text-[11px] text-[var(--t-faint)]">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(item.id);
                              setDraft(item.content);
                            }}
                            className="hover:text-[var(--cool)]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => remove(item.id)}
                            className="hover:text-[#e08a8a] disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </span>
                      </div>
                    ),
                  )}
                  <div className="rounded-lg border border-dashed border-[var(--line-2)] bg-black/10 p-3">
                    <textarea
                      value={addDraft}
                      onChange={(e) => setAddDraft(e.target.value)}
                      rows={2}
                      placeholder={`Add to "${section.label}" in your own words…`}
                      className="w-full resize-y rounded-md border border-[var(--line)] bg-black/30 p-2 text-sm text-[var(--text)] placeholder:text-[var(--t-faint)] focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={pending || addDraft.trim().length === 0}
                      onClick={() => addTo(section.key)}
                      className="mt-2 rounded-md bg-[var(--amber)] px-3 py-1 text-xs font-semibold text-black disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Danger zone */}
      <div className="mt-8 rounded-[var(--radius)] border border-[#5a2b2b] bg-[#2a1414]/40 p-5">
        <div className="font-display text-base text-[var(--text)]">Delete all my data</div>
        <p className="mt-1 text-sm text-[var(--t-dim)]">
          Permanently removes your entire profile. This can&apos;t be undone.
        </p>
        {confirmWipe ? (
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={wipeAll}
              className="rounded-lg bg-[#b34747] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Yes, delete everything
            </button>
            <button
              type="button"
              onClick={() => setConfirmWipe(false)}
              className="rounded-lg border border-[var(--line-2)] px-4 py-2 text-sm text-[var(--t-dim)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmWipe(true)}
            className="mt-3 rounded-lg border border-[#7a3a3a] px-4 py-2 text-sm text-[#e0a0a0] transition hover:bg-[#3a1c1c]"
          >
            Delete all my data
          </button>
        )}
      </div>
    </div>
  );
}
