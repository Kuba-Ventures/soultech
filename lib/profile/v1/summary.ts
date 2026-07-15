import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "@/lib/models/_anthropic";
import { stripEmDashes } from "@/lib/text";
import {
  getProfileSummaryCache,
  saveProfileSummaryCache,
} from "./store";
import type { ProfileItem } from "./types";

/**
 * The profile header's one-line portrait ("You're a …") plus a few short trait
 * tags. Synthesized from the whole profile (not per-import), cached in
 * members.settings, and regenerated when the item count changes. Kept separate
 * from the parse/append pipeline so importing stays incremental while the
 * portrait always reflects the full picture.
 */

export type ProfileSummary = { portrait: string; traits: string[] };

// Fast + cheap: the output is one sentence plus a handful of short tags.
const MODEL = "claude-haiku-4-5";
const MAX_TRAITS = 6;

const SYSTEM = `You write the header of a personalized-learning profile from a list of second-person statements about how someone communicates, thinks, and learns.

Return:
- "portrait": ONE second-person sentence starting with "You're a" or "You" that captures the person at a glance. Specific, grounded in the statements, no fluff, no invented traits, no em-dashes.
- "traits": 3 to 6 short tags, 1 to 3 words each, Title Case (e.g. "Hands-on", "Direct", "Example-first", "Wants a recommendation"). Each grounded in the statements.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    portrait: { type: "string" },
    traits: { type: "array", items: { type: "string" } },
  },
  required: ["portrait", "traits"],
} as const;

async function generate(items: ProfileItem[]): Promise<ProfileSummary> {
  const corpus = items.map((i) => `- ${i.content}`).join("\n");
  const res = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: 400,
    thinking: { type: "disabled" },
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: `Profile statements:\n${corpus}\n\nWrite the header.` }],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = JSON.parse(text) as { portrait?: unknown; traits?: unknown };
  const portrait =
    typeof parsed.portrait === "string" ? stripEmDashes(parsed.portrait.trim()) : "";
  const traits = Array.isArray(parsed.traits)
    ? parsed.traits
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .map((t) => t.trim())
        .slice(0, MAX_TRAITS)
    : [];
  return { portrait, traits };
}

/**
 * Cached portrait + traits for the member. Regenerates when the item count
 * changes; falls back to stale cache (or null) if generation fails.
 */
export async function getOrGenerateSummary(
  memberId: string,
  items: ProfileItem[],
): Promise<ProfileSummary | null> {
  if (items.length === 0) return null;

  const cached = await getProfileSummaryCache(memberId);
  if (cached && cached.atItemCount === items.length) {
    return { portrait: cached.portrait, traits: cached.traits };
  }

  try {
    const summary = await generate(items);
    if (!summary.portrait && summary.traits.length === 0) {
      return cached ? { portrait: cached.portrait, traits: cached.traits } : null;
    }
    await saveProfileSummaryCache(memberId, { ...summary, atItemCount: items.length });
    return summary;
  } catch (err) {
    console.error("[profile.v1.summary] generation failed", err);
    return cached ? { portrait: cached.portrait, traits: cached.traits } : null;
  }
}
