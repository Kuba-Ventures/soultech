/**
 * Soultech v1 — canonical structured profile schema.
 *
 * The profile is ALWAYS structured JSON organized into the ten fixed
 * categories below — never free text. Every downstream feature (the profile
 * hub, per-item editing, the compile-to-system-prompt step, the future
 * "mirror moment" review) reads this shape. Do not add free-form profile
 * storage anywhere; extend the schema here instead.
 *
 * This file is the single source of truth for the ten categories. Reference
 * `CATEGORY_KEYS` / `CATEGORIES` everywhere rather than re-listing them.
 */

export const CATEGORY_KEYS = [
  "communication_register",
  "characteristic_phrasing",
  "how_they_ask",
  "information_delivery",
  "reasoning_patterns",
  "recurring_topics",
  "values_and_criteria",
  "engagement_style",
  "patterns_and_contradictions",
  "emotional_cues",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

/** Human-facing label + one-line description per category, in canonical order. */
export const CATEGORIES: { key: CategoryKey; label: string; blurb: string }[] = [
  {
    key: "communication_register",
    label: "Communication register",
    blurb:
      "Formal vs. informal voice, sentence length, directness, warmth, and how it shifts by topic or mood.",
  },
  {
    key: "characteristic_phrasing",
    label: "Characteristic phrasing",
    blurb: "Verbal tics, favored words, how they open and close, and their humor style.",
  },
  {
    key: "how_they_ask",
    label: "How they ask questions",
    blurb: "What their questions reveal about how they approach problems.",
  },
  {
    key: "information_delivery",
    label: "How they like information delivered",
    blurb:
      "Analogy- / example- / definition-first, step-by-step, preferred depth and pace, stated likes and dislikes.",
  },
  {
    key: "reasoning_patterns",
    label: "Reasoning patterns",
    blurb:
      "First-principles vs. analogical, top-down vs. bottom-up, and how they handle uncertainty and tradeoffs.",
  },
  {
    key: "recurring_topics",
    label: "Recurring topics & expertise",
    blurb: "Domains they return to, fluent vs. learning, and genuine interests.",
  },
  {
    key: "values_and_criteria",
    label: "What they value / decision criteria",
    blurb: "What they optimize for, what they dismiss, and how they decide.",
  },
  {
    key: "engagement_style",
    label: "How they like to be engaged",
    blurb:
      "Challenged vs. affirmed, pushed back on vs. agreed with, options vs. a single recommendation.",
  },
  {
    key: "patterns_and_contradictions",
    label: "Patterns & contradictions",
    blurb: "Stated wants vs. actual behavior, circled topics, and blind spots.",
  },
  {
    key: "emotional_cues",
    label: "Emotional & tonal cues",
    blurb: "How they signal excitement, frustration, confusion, or being stuck.",
  },
];

const CATEGORY_KEY_SET = new Set<string>(CATEGORY_KEYS);

/** Type guard: is a raw string one of the ten canonical category keys? */
export function isCategoryKey(value: unknown): value is CategoryKey {
  return typeof value === "string" && CATEGORY_KEY_SET.has(value);
}

/** Look up the display label for a category key (falls back to the raw key). */
export function categoryLabel(key: CategoryKey): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export type ProfileItem = {
  id: string;
  category: CategoryKey;
  /** The observation. Verbatim quotes preserved where present. */
  content: string;
  /** Provenance, e.g. "[conversation, ~2026-03]", "[memory]", or "user-edited". */
  source: string;
  /** Optional, from any "[frequency <n>]" label in the export. */
  frequency?: number;
};

export type Profile = {
  userId: string;
  items: ProfileItem[];
  /** ISO 8601 timestamp of the last write. */
  updatedAt: string;
};
