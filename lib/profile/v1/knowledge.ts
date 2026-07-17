/**
 * Soultech v1 — the "Learned %" signal.
 *
 * How well Soultech knows a member, from two things:
 *   1. COVERAGE (85%) — category coverage weighted by depth. Each of the ten
 *      fixed categories is worth an equal share, filling in as it gains items,
 *      capped so one flooded category can't dominate.
 *   2. BREADTH (15%) — how many independent kinds of source corroborate the
 *      profile (an AI paste AND an upload AND a live connection). Coverage alone
 *      tops out at 85%; the last 15% requires source variety.
 *
 * So a member who only pastes one AI export reaches ~85%, and adding a file /
 * connecting Notion carries them to 100% — which keeps "connect a source" an
 * honest way to raise the number rather than a nudge shown next to a full bar.
 *
 * This module is a pure function of the profile + the source list — no I/O, no
 * model calls — so it recomputes live on every profile write and is
 * unit-testable in isolation, like compileProfile. Reference `CATEGORY_KEYS` /
 * `CATEGORIES` from ./types; never re-list them.
 */

import { CATEGORIES, CATEGORY_KEYS, SECTIONS } from "./types";
import type {
  CategoryKey,
  ProfileItem,
  SectionKey,
  SourceEntry,
  SourceKind,
} from "./types";

/**
 * How "known" a single category is given how many items it holds. Indexed by
 * item count and capped at 3: the first item is worth the most, a second and
 * third round it out, and further items in the same category add nothing to the
 * score (they still enrich the profile — they just can't inflate coverage).
 */
const DEPTH_BY_COUNT = [0, 0.55, 0.8, 1] as const;

/** Coverage vs. breadth split of the final score. Must sum to 1. */
const COVERAGE_WEIGHT = 0.85;
const BREADTH_WEIGHT = 0.15;

/**
 * Distinct source kinds that count as "full breadth". At this many independent
 * kinds the breadth component is maxed; the profile is corroborated from enough
 * different angles.
 */
const BREADTH_TARGET_KINDS = 3;

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
  /** 0..1 — the coverage component (category depth), before weighting. */
  coverage: number;
  /** 0..1 — the breadth component (source variety), before weighting. */
  breadth: number;
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

/**
 * Breadth (0..1) from the number of distinct source kinds. One kind is no
 * corroboration (0); each additional distinct kind climbs linearly to full
 * breadth at BREADTH_TARGET_KINDS.
 */
function breadthFor(sources: SourceEntry[]): number {
  const kinds = new Set<SourceKind>(sources.map((s) => s.kind));
  if (kinds.size <= 1) return 0;
  return Math.min(kinds.size - 1, BREADTH_TARGET_KINDS - 1) / (BREADTH_TARGET_KINDS - 1);
}

/** Compute the Learned % (coverage + breadth) and the breakdown behind it. */
export function computeKnowledge(items: ProfileItem[], sources: SourceEntry[]): Knowledge {
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

  const coverage = byCategory.reduce((sum, c) => sum + c.score, 0) / CATEGORY_KEYS.length;
  const breadth = breadthFor(sources);
  const percent = Math.round((coverage * COVERAGE_WEIGHT + breadth * BREADTH_WEIGHT) * 100);
  return { percent, coverage, breadth, byCategory };
}

/**
 * One slice of the Learned donut. `pct` is a share of the *whole* ring (0..100),
 * so the slices plus the empty remainder always sum to 100 and the filled arc
 * equals `Knowledge.percent`.
 */
export type LearnedSegment = {
  /** A reader-facing section, or the source-variety (breadth) slice. */
  key: SectionKey | "breadth";
  label: string;
  /** Share of the full ring, in percent (0..100). */
  pct: number;
};

/** Label for the breadth slice — the source-variety contribution to the score. */
const BREADTH_SEGMENT_LABEL = "Sources";

/**
 * Break the Learned % into the slices that produced it, for the profile donut:
 * one slice per reader-facing section (its categories' coverage contribution)
 * plus a "Sources" slice for the breadth component. Each slice is expressed as a
 * share of the whole ring, so summing them gives `Knowledge.percent` and the
 * rest of the ring is the unlearned remainder. Empty slices are dropped, so the
 * legend only ever lists sections that actually contribute.
 */
export function learnedSegments(k: Knowledge): LearnedSegment[] {
  const scoreByCategory = new Map<CategoryKey, number>(
    k.byCategory.map((c) => [c.key, c.score]),
  );

  const segments: LearnedSegment[] = [];
  for (const section of SECTIONS) {
    const scoreSum = section.categories.reduce(
      (sum, key) => sum + (scoreByCategory.get(key) ?? 0),
      0,
    );
    const pct = (scoreSum / CATEGORY_KEYS.length) * COVERAGE_WEIGHT * 100;
    if (pct > 0) segments.push({ key: section.key, label: section.label, pct });
  }

  const breadthPct = k.breadth * BREADTH_WEIGHT * 100;
  if (breadthPct > 0) {
    segments.push({ key: "breadth", label: BREADTH_SEGMENT_LABEL, pct: breadthPct });
  }

  return segments;
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
 * Source-variety levers, in priority order. Each raises the breadth component
 * by adding a kind the member doesn't have yet. Draft copy — style-steward
 * owns the final wording.
 */
const BREADTH_LEVERS: { kind: SourceKind; label: string }[] = [
  { kind: "connection", label: "Connect Notion to pull in more of your writing" },
  { kind: "upload", label: "Upload a writing sample in your own words" },
  { kind: "ai", label: "Paste an export from an AI you use" },
  { kind: "custom", label: "Write a quick note about how you communicate" },
];

/**
 * The top few ways to raise the Learned %: thinnest categories first (to lift
 * coverage), then missing source kinds (to lift breadth). All phrased as
 * existing actions linking to the Sources manager. Returns at most three, and
 * empty once the profile is fully covered AND corroborated — so a full bar is
 * never shown next to a "to learn more" nudge.
 */
export function suggestImprovements(
  items: ProfileItem[],
  sources: SourceEntry[],
): Suggestion[] {
  const { byCategory } = computeKnowledge(items, sources);

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

  // Breadth: only while source variety isn't maxed. Gating on the kind count
  // (not on the raw score) is what keeps this quiet at 100% — a fully-diverse
  // profile has nothing here even if it happens to lack, say, a connection.
  const kinds = new Set<SourceKind>(sources.map((s) => s.kind));
  if (kinds.size < BREADTH_TARGET_KINDS) {
    for (const lever of BREADTH_LEVERS) {
      if (out.length >= 3) break;
      if (!kinds.has(lever.kind)) out.push({ label: lever.label, href: IMPORT_HREF });
    }
  }

  return out.slice(0, 3);
}
