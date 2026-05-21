import { generateResponse } from "@/lib/models/generateResponse";

const SUMMARIZE_SYSTEM = `Summarize the input as exactly one neutral, present-tense sentence under 25 words. No preamble. No quotes. No first-person framing ("the speaker..."). Just the sentence.`;

const SUMMARIZE_MODEL = "claude-haiku-4-5-20251001";

/**
 * Cheap one-sentence summary used as the `content_summary` for upload-derived
 * memories. Falls back to a truncated snippet if Haiku errors so we never
 * block a write on the summary step.
 */
export async function summarizeChunk(content: string): Promise<string> {
  try {
    const resp = await generateResponse({
      model: SUMMARIZE_MODEL,
      system: SUMMARIZE_SYSTEM,
      messages: [{ role: "user", content }],
      maxTokens: 80,
    });
    const line = resp.content.trim().replace(/^\s*[-•]\s*/, "");
    return line.length > 0 ? line : fallback(content);
  } catch (err) {
    console.error("[summarize] haiku failed; using snippet", err);
    return fallback(content);
  }
}

function fallback(content: string): string {
  const collapsed = content.replace(/\s+/g, " ").trim();
  if (collapsed.length <= 200) return collapsed;
  return collapsed.slice(0, 199).trimEnd() + "…";
}
