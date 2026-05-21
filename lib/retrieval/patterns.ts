import { generateResponse } from "@/lib/models/generateResponse";
import type { RetrievedMemory } from "./search";

/**
 * Pre-pass over retrieved memories + the member's current question. Returns
 * a one-line observation when there's a meaningful pattern (recurring theme,
 * past similar decision, contradiction). Returns null when nothing surfaces.
 */

const HAIKU_MODEL = "claude-haiku-4-5-20251001";

const PATTERN_SYSTEM = `You read a member's current question alongside memories retrieved from their own writing. You look for patterns worth surfacing back to them:
- Recurring themes
- Similar past decisions or framings
- Contradictions between memories
- Repeated vocabulary that signals a held belief

Rules:
- If nothing meaningful emerges, respond with exactly: NONE
- Otherwise respond with one observation under 60 words, no preamble, no quotes.
- Do not stretch. Do not invent connections. Better to say NONE than fabricate.`;

export async function detectPattern(
  question: string,
  retrieved: RetrievedMemory[],
): Promise<string | null> {
  if (retrieved.length < 3) return null;

  const memorySection = retrieved
    .map((m, idx) => `[M${idx + 1}] ${m.contentSummary}`)
    .join("\n");
  const user = [
    "Memories:",
    memorySection,
    "",
    `Question: ${question}`,
  ].join("\n");

  try {
    const resp = await generateResponse({
      model: HAIKU_MODEL,
      system: PATTERN_SYSTEM,
      messages: [{ role: "user", content: user }],
      maxTokens: 140,
    });
    const out = resp.content.trim();
    if (!out || /^NONE\b/i.test(out)) return null;
    return out;
  } catch (err) {
    console.error("[patterns.detectPattern]", err);
    return null;
  }
}
