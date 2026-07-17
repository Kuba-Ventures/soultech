/**
 * Soultech v1 — the "Learned %" signal.
 *
 * How well Soultech knows a member, derived purely from their structured
 * profile. The score is category COVERAGE weighted by depth: each of the ten
 * fixed categories is worth an equal share, and a category's share fills in as
 * it gains items, capped so one flooded category can't dominate. Full coverage
 * across all ten categories genuinely reaches 100%.
 *
 * This module is a pure function of the profile (plus the source list, for
 * targeting suggestions) — no I/O, no model calls — so it recomputes live on
 * every profile write and is unit-testable in isolation, like compileProfile.
 * Reference `CATEGORY_KEYS` / `CATEGORIES` from ./types; never re-list them.
 */

import { CATEGORIES, CATEGORY_KEYS } from "./types";
import type { CategoryKey, ProfileItem, SourceEntry } from "./types";

/**
 * How "known" a single category is given how many items it holds. Indexed by
 * item count and capped at 3: the first item is worth the most, a second and
 * third round it out, and further items in the same category add nothing to the
 * score (they still enrich the profile — they just can't inflate coverage).
 */
const DEPTH_BY_COUNT = [0, 0.55, 0.8, 1] as const;

/** Where every "add more" action lives — the Sources manager (route `/import`). */
const IMPORT_HREF = "/import";

export type CategoryStrength = {
  key: CategoryKey;
  label: string;
  count: number;
  /** 0..1 — how filled-in this category is. */
  score: number;
};

export type Knowledge = {
  /** 0..100, rounded — the headline "Learned %". */
  percent: number;
  /** Per-category strength, in canonical order. */
  byCategory: CategoryStrength[];
};

export type Suggestion = {
  /** Short imperative nudge shown under the score. */
  label: string;
  /** Where the action lives — always the Sources manager for v1. */
  href: string;
  /** The category this nudge targets, when it's a coverage nudge. */
  category?: CategoryKey;
};

/** Coverage contribution of a category holding `count` items (0..1). */
function depthFor(count: number): number {
  if (count <= 0) return 0;
  return DEPTH_BY_COUNT[Math.min(count, 3)];
}

/** Compute the Learned % and the per-category breakdown behind it. */
export function computeKnowledge(items: ProfileItem[]): Knowledge {
  const counts = new Map<CategoryKey, number>();
  for (const key of CATEGORY_KEYS) counts.set(key, 0);
  for (const it of items) {
    // Items are normalized to a valid CategoryKey by the store; guard anyway.
    if (counts.has(it.category)) counts.set(it.category, (counts.get(it.category) ?? 0) + 1);
  }

  const byCategory: CategoryStrength[] = CATEGORIES.map((c) => {
    const count = counts.get(c.key) ?? 0;
    return { key: c.key, label: c.label, count, score: depthFor(count) };
  });

  const mean = byCategory.reduce((sum, c) => sum + c.score, 0) / CATEGORY_KEYS.length;
  return { percent: Math.round(mean * 100), byCategory };
}

/**
 * Per-category nudge copy. Each points at an action that already exists today
 * (add / upload / paste a source) rather than a new input surface.
 */
const CATEGORY_NUDGE: Record<CategoryKey, string> = {
  communication_register: "Add a writing sample so Soultech learns your voice",
  characteristic_phrasing: "Share something you wrote so Soultech picks up your phrasing",
  how_they_ask: "Add a conversation where you're the one asking the questions",
  information_delivery: "Add a source that shows how you like things explained",
  reasoning_patterns: "Add a source that shows how you reason through problems",
  recurring_topics: "Add a source about the topics you keep coming back to",
  values_and_criteria: "Add a source about what you value and how you decide",
  engagement_style: "Add a source that shows how you like to be challenged",
  patterns_and_contradictions: "Add more sources so Soultech can spot your patterns",
  emotional_cues: "Add a source that shows how you signal excitement or frustration",
};

/**
 * The top few ways to raise the Learned %, thinnest categories first, phrased
 * as existing actions and all linking to the Sources manager. Returns at most
 * three; empty when the profile is already fully covered.
 */
export function suggestImprovements(
  items: ProfileItem[],
  sources: SourceEntry[],
): Suggestion[] {
  const { byCategory } = computeKnowledge(items);

  const thinnestFirst = byCategory
    .filter((c) => c.score < 1)
    .sort(
      (a, b) =>
        a.score - b.score ||
        CATEGORY_KEYS.indexOf(a.key) - CATEGORY_KEYS.indexOf(b.key),
    );

  const out: Suggestion[] = thinnestFirst.slice(0, 2).map((c) => ({
    label: CATEGORY_NUDGE[c.key],
    href: IMPORT_HREF,
    category: c.key,
  }));

  // One source-diversity nudge: a live connection corroborates the pasted/
  // uploaded sources, so surface it while there isn't one and there's room.
  const hasConnection = sources.some((s) => s.kind === "connection");
  if (!hasConnection && out.length < 3) {
    out.push({ label: "Connect Notion to pull in more of your writing", href: IMPORT_HREF });
  }

  return out.slice(0, 3);
}
