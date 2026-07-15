"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  SECTIONS,
  primaryCategoryForSection,
  sectionForCategory,
} from "@/lib/profile/v1/types";
import type { Profile, ProfileItem, SectionKey } from "@/lib/profile/v1/types";
import {
  addProfileItem,
  deleteAllProfileData,
  deleteProfileItem,
  updateProfileItem,
} from "@/app/(app)/profile/actions";

// NOTE: the periodic "mirror moment" review (surface a few statements and ask
// "still true?") would hook in here — same store, reuses updateProfileItem /
// deleteProfileItem below. Not built yet (deferred).

type Props = { initialProfile: Profile | null };

export function ProfileHub({ initialProfile }: Props) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [addingSection, setAddingSection] = useState<SectionKey | null>(null);
  const [addDraft, setAddDraft] = useState("");
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Group items into the reader-facing sections.
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
        setAddingSection(null);
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

  if (total === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-8 text-center">
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono text-xs text-[var(--t-faint)]">
          {total} thing{total === 1 ? "" : "s"} learned
          {profile && ` · updated ${new Date(profile.updatedAt).toLocaleDateString()}`}
        </div>
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

      {SECTIONS.map((section) => {
        const items = bySection.get(section.key) ?? [];
        if (items.length === 0 && addingSection !== section.key) return null;
        return (
          <section
            key={section.key}
            className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-5"
          >
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h2 className="font-display text-lg text-[var(--text)]">{section.label}</h2>
                <p className="mt-0.5 text-xs text-[var(--t-faint)]">{section.blurb}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddingSection(section.key);
                  setAddDraft("");
                }}
                className="shrink-0 rounded-md border border-[var(--line-2)] px-2.5 py-1 text-xs text-[var(--t-dim)] transition hover:text-[var(--text)]"
              >
                + Add
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              {items.map((item) => (
                <div key={item.id} className="group">
                  {editingId === item.id ? (
                    <div className="rounded-lg border border-[var(--line)] bg-black/20 p-3">
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
                    <div className="flex items-start gap-3 rounded-lg px-3 py-2 transition hover:bg-white/[0.03]">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--amber)]/70" />
                      <p className="flex-1 text-sm leading-relaxed text-[var(--text)]">
                        {item.content}
                      </p>
                      <span className="mt-0.5 flex shrink-0 gap-2 text-[11px] text-[var(--t-faint)] opacity-0 transition group-hover:opacity-100">
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
                  )}
                </div>
              ))}

              {addingSection === section.key && (
                <div className="rounded-lg border border-dashed border-[var(--line-2)] bg-black/10 p-3">
                  <textarea
                    value={addDraft}
                    onChange={(e) => setAddDraft(e.target.value)}
                    rows={2}
                    autoFocus
                    placeholder="Add something in your own words, e.g. &ldquo;You learn best from a worked example first.&rdquo;"
                    className="w-full resize-y rounded-md border border-[var(--line)] bg-black/30 p-2 text-sm text-[var(--text)] placeholder:text-[var(--t-faint)] focus:outline-none"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={pending || addDraft.trim().length === 0}
                      onClick={() => addTo(section.key)}
                      className="rounded-md bg-[var(--amber)] px-3 py-1 text-xs font-semibold text-black disabled:opacity-40"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingSection(null)}
                      className="rounded-md border border-[var(--line-2)] px-3 py-1 text-xs text-[var(--t-dim)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* Danger zone — delete all */}
      <div className="rounded-[var(--radius)] border border-[#5a2b2b] bg-[#2a1414]/40 p-5">
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
