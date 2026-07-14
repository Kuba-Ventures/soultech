"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CATEGORIES } from "@/lib/profile/v1/types";
import type { CategoryKey, Profile, ProfileItem } from "@/lib/profile/v1/types";
import {
  addProfileItem,
  deleteAllProfileData,
  deleteProfileItem,
  updateProfileItem,
} from "@/app/(app)/profile/actions";

// NOTE: the periodic "mirror moment" review (surface a few items and ask
// "still true?") would hook in here — it reads the same store and reuses
// updateProfileItem / deleteProfileItem below. Not built yet (deferred).

type Props = { initialProfile: Profile | null };

export function ProfileHub({ initialProfile }: Props) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [addingCategory, setAddingCategory] = useState<CategoryKey | null>(null);
  const [addDraft, setAddDraft] = useState("");
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byCategory = useMemo(() => {
    const map = new Map<CategoryKey, ProfileItem[]>();
    for (const item of profile?.items ?? []) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
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

  function addTo(category: CategoryKey) {
    const content = addDraft;
    run(async () => {
      const r = await addProfileItem({ category, content });
      if (r.ok) {
        setProfile(r.profile);
        setAddingCategory(null);
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
        <div className="font-display text-xl text-[var(--text)]">
          Nothing here yet
        </div>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--t-dim)]">
          Import a self-portrait and Soultech reads it into the ten-category model of who
          you are.
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
          {total} item{total === 1 ? "" : "s"}
          {profile && ` · updated ${new Date(profile.updatedAt).toLocaleString()}`}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-[#e08a8a]">{error}</span>}
          <Link
            href="/import"
            className="rounded-lg border border-[var(--line-2)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--text)] transition hover:bg-white/10"
          >
            Re-import
          </Link>
        </div>
      </div>

      {CATEGORIES.map((cat) => {
        const items = byCategory.get(cat.key) ?? [];
        return (
          <section
            key={cat.key}
            className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-5"
          >
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h2 className="font-display text-lg text-[var(--text)]">{cat.label}</h2>
                <p className="mt-0.5 text-xs text-[var(--t-faint)]">{cat.blurb}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddingCategory(cat.key);
                  setAddDraft("");
                }}
                className="shrink-0 rounded-md border border-[var(--line-2)] px-2.5 py-1 text-xs text-[var(--t-dim)] transition hover:text-[var(--text)]"
              >
                + Add
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {items.length === 0 && addingCategory !== cat.key && (
                <div className="text-sm text-[var(--t-faint)]">Nothing here yet.</div>
              )}

              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-[var(--line)] bg-black/15 p-3"
                >
                  {editingId === item.id ? (
                    <div>
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={3}
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
                    <div>
                      <p className="text-sm leading-relaxed text-[var(--text)]">
                        {item.content}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="font-mono text-[11px] text-[var(--t-faint)]">
                          {item.source}
                          {item.frequency != null && ` · frequency ${item.frequency}`}
                        </span>
                        <span className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(item.id);
                              setDraft(item.content);
                            }}
                            className="text-xs text-[var(--t-dim)] transition hover:text-[var(--cool)]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => remove(item.id)}
                            className="text-xs text-[var(--t-dim)] transition hover:text-[#e08a8a] disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {addingCategory === cat.key && (
                <div className="rounded-lg border border-dashed border-[var(--line-2)] bg-black/10 p-3">
                  <textarea
                    value={addDraft}
                    onChange={(e) => setAddDraft(e.target.value)}
                    rows={3}
                    autoFocus
                    placeholder="Add an observation in your own words…"
                    className="w-full resize-y rounded-md border border-[var(--line)] bg-black/30 p-2 text-sm text-[var(--text)] placeholder:text-[var(--t-faint)] focus:outline-none"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={pending || addDraft.trim().length === 0}
                      onClick={() => addTo(cat.key)}
                      className="rounded-md bg-[var(--amber)] px-3 py-1 text-xs font-semibold text-black disabled:opacity-40"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingCategory(null)}
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
