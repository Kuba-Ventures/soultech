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

/**
 * Reader-facing sections. The ten categories are the machine model; these
 * group them into a handful of friendly, second-person sections the profile
 * view renders ("How you learn", "How you communicate", …). Every category
 * belongs to exactly one section, so the mapping is total.
 */
export type SectionKey =
  | "how_you_learn"
  | "how_you_communicate"
  | "how_you_think"
  | "what_you_value"
  | "what_youre_into"
  | "quirks";

export const SECTIONS: {
  key: SectionKey;
  label: string;
  blurb: string;
  categories: CategoryKey[];
}[] = [
  {
    key: "how_you_learn",
    label: "How you learn",
    blurb: "How you like ideas delivered, and how you like to be engaged.",
    categories: ["information_delivery", "engagement_style"],
  },
  {
    key: "how_you_communicate",
    label: "How you communicate",
    blurb: "Your voice, register, and the phrasing you reach for.",
    categories: ["communication_register", "characteristic_phrasing"],
  },
  {
    key: "how_you_think",
    label: "How you think",
    blurb: "How you ask questions and reason through problems.",
    categories: ["how_they_ask", "reasoning_patterns"],
  },
  {
    key: "what_you_value",
    label: "What you value",
    blurb: "What you optimize for and how you decide.",
    categories: ["values_and_criteria"],
  },
  {
    key: "what_youre_into",
    label: "What you're into",
    blurb: "The domains you keep coming back to.",
    categories: ["recurring_topics"],
  },
  {
    key: "quirks",
    label: "Quirks & tells",
    blurb: "Patterns, contradictions, and how you signal what you're feeling.",
    categories: ["patterns_and_contradictions", "emotional_cues"],
  },
];

const CATEGORY_TO_SECTION = new Map<CategoryKey, SectionKey>(
  SECTIONS.flatMap((s) => s.categories.map((c) => [c, s.key] as const)),
);

/** The friendly section a category belongs to (defaults to quirks). */
export function sectionForCategory(category: CategoryKey): SectionKey {
  return CATEGORY_TO_SECTION.get(category) ?? "quirks";
}

/** The primary category to file a manually-added item under, per section. */
export function primaryCategoryForSection(section: SectionKey): CategoryKey {
  return SECTIONS.find((s) => s.key === section)?.categories[0] ?? "patterns_and_contradictions";
}

export type ProfileItem = {
  id: string;
  category: CategoryKey;
  /** The observation. Verbatim quotes preserved where present. */
  content: string;
  /** Provenance, e.g. "[conversation, ~2026-03]", "[memory]", or "user-edited". */
  source: string;
  /**
   * Id of the SourceEntry this item came from, if any. Lets a member remove a
   * source and cascade-delete everything it contributed. Absent on
   * hand-authored items and on items imported before sources were tracked.
   */
  sourceId?: string;
  /** Optional, from any "[frequency <n>]" label in the export. */
  frequency?: number;
};

export type Profile = {
  userId: string;
  items: ProfileItem[];
  /** ISO 8601 timestamp of the last write. */
  updatedAt: string;
};

/** How a source was added. */
export const SOURCE_KINDS = ["ai", "upload", "custom", "connection"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export function isSourceKind(v: unknown): v is SourceKind {
  return typeof v === "string" && (SOURCE_KINDS as readonly string[]).includes(v);
}

/**
 * A managed source the member added: an AI paste, an uploaded file, a custom
 * entry, or a live connection. Stored in members.settings.sourcesV1. Profile
 * items reference these by id (ProfileItem.sourceId) so removing a source can
 * cascade-delete what it taught Soultech.
 */
export type SourceEntry = {
  id: string;
  kind: SourceKind;
  /** Brand/provider key for the icon + grouping: "claude", "chatgpt", "notion", "file", "custom". */
  provider: string;
  /** Human label shown in the UI. */
  label: string;
  /** ISO 8601 timestamp added. */
  addedAt: string;
  /** For uploads: original filename. */
  fileName?: string;
  /** For uploads with blob storage on: the stored file URL (unguessable). */
  fileUrl?: string;
};
