/**
 * The AI providers a member can attribute a pasted self-portrait to on the
 * onboarding "Paste a self-portrait" step. Tagging each paste keeps two exports
 * (say, one from Claude and one from ChatGPT) distinct in the Sources list
 * instead of collapsing into identical "Self-portrait export" rows.
 *
 * Single source of truth: the wizard renders `AI_PASTE_SOURCES` as its picker
 * (the `key` doubles as the BrandIcon `brand`), and the server action validates
 * the submitted key with `isAiSourceKey` and labels the source with
 * `aiSourceLabel`. Add a provider here and both sides pick it up.
 */
export const AI_PASTE_SOURCES = [
  { key: "claude", label: "Claude" },
  { key: "chatgpt", label: "ChatGPT" },
  { key: "gemini", label: "Gemini" },
  { key: "other", label: "Other" },
] as const;

export type AiSourceKey = (typeof AI_PASTE_SOURCES)[number]["key"];

const AI_SOURCE_KEYS = new Set<string>(AI_PASTE_SOURCES.map((s) => s.key));

/** Type guard: is a raw value one of the picker's provider keys? */
export function isAiSourceKey(value: unknown): value is AiSourceKey {
  return typeof value === "string" && AI_SOURCE_KEYS.has(value);
}

/**
 * Human label to store on the SourceEntry (shown in the Sources list). "other"
 * gets the clearer "Other AI"; the rest use their picker label verbatim.
 */
export function aiSourceLabel(key: AiSourceKey): string {
  const base = AI_PASTE_SOURCES.find((s) => s.key === key)?.label ?? "AI";
  return key === "other" ? "Other AI" : base;
}
