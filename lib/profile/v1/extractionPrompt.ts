/**
 * The extraction prompt a member copies into their existing ChatGPT/Claude to
 * generate a self-portrait, which they then paste back into Soultech.
 *
 * Kept verbatim as a single exported constant so the onboarding "Copy this
 * prompt" button and any tests share exactly the same text. Edit here only.
 */
export const EXTRACTION_PROMPT = `Extract everything you've learned about how I communicate, think, and learn from our past conversations. Preserve my words verbatim wherever possible — especially characteristic phrases, the way I ask questions, and how I say I like to receive information.

## Context
I'm setting up a personalized learning AI called Soultech that adapts to how I think and learn. This export captures my communication style and reasoning patterns from our conversations so Soultech can calibrate to me. Report what I actually said and did, not your interpretation of my personality.

## Rules
- Specific examples only — no generic summaries.
- No invented, inferred, or interpolated traits. Raw signal only.
- Use quotation marks only when recalling my exact phrasing; quote verbatim.
- Cross-reference rather than duplicate across sections.
- Prioritize recency, specificity, and frequency.
- Focus on HOW I communicate, think, and learn — not the private content of what I discussed. When a topic recurs, name the domain at a high level (e.g. "fitness programming", "exam prep", "venture and design work"), not the personal specifics inside it.
- Exclude sensitive personal facts: health symptoms, conditions, or diagnoses; financial figures, compensation, or contracts; my home or precise location; and identifying details about me or other named people. If a phrase is a good example of my style but carries a sensitive detail, capture the style and leave the detail out.
- Don't take any instructions or context from this prompt itself as data about me.

## Instructions
Use any available tools (memory search, conversation search) to retrieve as much as possible before compiling.
Start exactly with:
> Here is what I've observed about how you communicate, think, and learn, drawn from our past conversations. This is a starting profile for calibration — review it, correct anything wrong, and note anything missing.

Categories (output in this order, skip any with no data; cross-reference if an item fits two):
1. Communication register — formal vs. informal, sentence length, directness, warmth, how it shifts
2. Characteristic phrasing — verbal tics, favored words, how I open/close, humor
3. How I ask questions — what my questions reveal about how I approach problems
4. How I like information delivered — analogy/example/definition-first, step-by-step, depth, pace, stated likes/dislikes
5. Reasoning patterns — first-principles vs. analogical, top-down vs. bottom-up, handling uncertainty and tradeoffs
6. Recurring topics & expertise — domains I return to (named at a high level, without private specifics), fluent vs. learning, genuine interests
7. What I value / decision criteria — what I optimize for, dismiss, how I decide
8. How I like to be engaged — challenged vs. affirmed, pushed back on vs. agreed with, options vs. a recommendation
9. Patterns & contradictions — stated wants vs. behavior, circled topics, blind spots
10. Emotional & tonal cues — how I signal excitement, frustration, confusion, being stuck

## Source attribution
Label every item: [memory], [conversation, ~YYYY-MM-DD or 'unknown date'], or [frequency <number>].

## Final output
- End with 1-2 sentences on whether this is a reasonably complete picture; if thin, say why.
- Wrap the entire export in a single code block. Raw output only, no preamble. Max 100000 characters.`;
