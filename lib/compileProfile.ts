import { CATEGORIES, type CategoryKey, type Profile } from "@/lib/profile/v1/types";

/**
 * Compile a structured Profile into a system-prompt string for the chat.
 *
 * This is the ONE place the ten-category profile becomes model guidance. It is
 * deliberately pure — no I/O, no model calls, no knowledge of the chat UI — so
 * we can iterate on personalization quality in isolation and unit-test it. The
 * chat route calls this and injects the result as the system prompt; nothing
 * else should assemble profile guidance.
 *
 * Design intent: translate observations ("they give current state before asking
 * for the next step") into behavior ("do X"), and tell the model to *act*
 * calibrated rather than describe the profile back to the user.
 */

// How each category is framed to the model. Order follows CATEGORIES.
const CATEGORY_DIRECTIVE: Record<CategoryKey, string> = {
  communication_register: "Their voice and register — match it in how you write back",
  characteristic_phrasing: "Phrasing they use — mirror lightly where natural, don't parrot",
  how_they_ask: "How they ask questions — what it reveals about approaching problems",
  information_delivery: "How they like information delivered — follow this closely",
  reasoning_patterns: "How they reason — reason alongside them this way",
  recurring_topics: "Domains they return to — assume fluency where noted, teach where learning",
  values_and_criteria: "What they optimize for and how they decide — weight answers toward this",
  engagement_style: "How they like to be engaged — challenge, affirm, or offer options accordingly",
  patterns_and_contradictions: "Patterns and contradictions — hold these lightly, don't lecture",
  emotional_cues: "Emotional and tonal cues — read these and respond to the state behind the words",
};

const PREAMBLE = `You are Soultech, a personalized learning partner for one specific person. Below is a structured model of how they communicate, think, and learn, built from their own words.

Use it to calibrate how you explain, teach, and reason with them — their register, the way they like information delivered, how they prefer to be engaged. Act calibrated; do not describe this profile back to them or announce that you are adapting. Be a sharp thinking partner, not a mirror. When the profile is silent on something, use good judgment.`;

const EMPTY_PROMPT = `You are Soultech, a personalized learning partner. You don't have a profile for this person yet, so communicate clearly and adaptively, pay attention to how they write and what they respond to, and (if it fits) mention they can build their profile from the Import screen so you can calibrate to them.`;

/** Build the full system prompt from a member's profile. */
export function compileProfile(profile: Profile | null): string {
  const items = profile?.items ?? [];
  if (items.length === 0) return EMPTY_PROMPT;

  const sections: string[] = [];
  for (const cat of CATEGORIES) {
    const catItems = items.filter((i) => i.category === cat.key);
    if (catItems.length === 0) continue;
    const bullets = catItems
      .map((i) => `- ${i.content}`)
      .join("\n");
    sections.push(`${CATEGORY_DIRECTIVE[cat.key]}:\n${bullets}`);
  }

  return `${PREAMBLE}\n\n${sections.join("\n\n")}`;
}

// Keywords → the short "in your style: …" tag shown on replies. Checked in
// order; first match wins. Derived from the delivery/register categories.
const TAG_RULES: { key: CategoryKey; match: RegExp; label: string }[] = [
  { key: "information_delivery", match: /analog/i, label: "analogy-first" },
  { key: "information_delivery", match: /example/i, label: "example-first" },
  { key: "information_delivery", match: /step[- ]?by[- ]?step|one[- ]?by[- ]?one|sequential/i, label: "step-by-step" },
  { key: "information_delivery", match: /definition|define/i, label: "definition-first" },
  { key: "information_delivery", match: /\bconcise|short|brief\b/i, label: "kept concise" },
  { key: "communication_register", match: /\bdirect\b/i, label: "direct" },
  { key: "engagement_style", match: /challenge|critique|push/i, label: "pushed, not just affirmed" },
];

/**
 * A short, subtle descriptor of the personalization in play, shown as an
 * eyebrow on replies (e.g. "analogy-first"). Falls back to a generic label.
 * Presentation only — never drives model behavior.
 */
export function styleTag(profile: Profile | null): string {
  const items = profile?.items ?? [];
  if (items.length === 0) return "getting to know you";
  for (const rule of TAG_RULES) {
    if (items.some((i) => i.category === rule.key && rule.match.test(i.content))) {
      return rule.label;
    }
  }
  return "calibrated to you";
}
