import type { RetrievedMemory } from "@/lib/retrieval/search";
import type { StyleProfile } from "@/lib/style/profile";

/**
 * System prompt for the reflective chat. Distinct from the Interviewer: this
 * is where the clone speaks *to* the member, drawing on their corpus. The
 * model is given a short numeric reference (M1, M2, ...) for each retrieved
 * memory and is instructed to cite by reference, not by quoting UUIDs.
 *
 * The prompt is composed dynamically with the member's cached style profile
 * and any pattern observation surfaced by the Haiku pre-pass.
 */

const BASE_PROMPT = `You are the member's personal clone. You know them through the memories below, retrieved from their own writing and conversations. Speak with them, not at them.

How to behave:
- Coach, do not just answer. Notice what's underneath the question and reflect it back.
- Cite memories you draw on using the form [M1], [M2], etc. Place the marker at the end of the relevant clause. Cite only memories you actually used; do not invent citations.
- If the retrieved memories are thin on this topic, say so plainly and ask one clarifying question rather than guessing.
- Match the member's voice. Mirror sentence length, vocabulary, and rhythm. Avoid generic chatbot phrasing ("I'd be happy to...", "Great question!").
- Surface tensions or patterns only when they appear in the memories. Do not fabricate continuity.

What not to do:
- Do not break character to mention RAG, retrieval, embeddings, or the technical setup.
- Do not list every memory you saw. Use the ones that matter.
- Do not hedge with disclaimers ("As an AI..."). You are the clone.

Format: prose, plain text. End with whatever ends the thought - the substance, a question, a quiet beat. No sign-off.`;

export function buildReflectiveSystemPrompt(opts?: {
  styleProfile?: StyleProfile | null;
  pattern?: string | null;
}): string {
  const parts: string[] = [BASE_PROMPT];

  if (opts?.styleProfile?.profile) {
    parts.push(
      `\nThe member's voice (use this to shape your phrasing):\n${opts.styleProfile.profile}`,
    );
  }

  if (opts?.pattern) {
    parts.push(
      `\nPattern observed in the corpus relevant to this turn (use only if it lands; do not force it):\n${opts.pattern}`,
    );
  }

  return parts.join("\n");
}

/** @deprecated Kept as an export for any test code; use buildReflectiveSystemPrompt(). */
export const REFLECTIVE_BASE_PROMPT = BASE_PROMPT;

/**
 * Build the per-turn user message that wraps retrieved memories around the
 * member's question. Sending memories inside a user message keeps the system
 * prompt cacheable and lets us tag each retrieved chunk with a stable Mn id
 * the model uses in citations.
 */
export function buildReflectiveUserMessage(
  memberMessage: string,
  retrieved: RetrievedMemory[],
): string {
  if (retrieved.length === 0) {
    return `Member message: ${memberMessage}\n\n(No memories retrieved. If you cannot answer from general context, ask the member for more grounding.)`;
  }

  const lines = retrieved.map((m, idx) => {
    const ref = `M${idx + 1}`;
    const when = m.createdAt.toISOString().slice(0, 10);
    const source = sourceLabel(m.sourceType);
    return `[${ref}] (${source}, ${when}) ${m.content}`;
  });

  return [
    "Retrieved memories:",
    ...lines,
    "",
    `Member message: ${memberMessage}`,
  ].join("\n");
}

function sourceLabel(s: RetrievedMemory["sourceType"]): string {
  return {
    chat: "reflect-chat",
    upload_doc: "document",
    upload_audio: "audio",
    voice_memo: "voice-memo",
  }[s];
}

/**
 * Parse [M1], [M2] markers out of a model response and map them to memory
 * UUIDs in the order they appeared in the retrieval set. Unknown references
 * are dropped silently (the model can hallucinate citation ids).
 */
export function parseCitations(
  response: string,
  retrieved: RetrievedMemory[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of response.matchAll(/\[M(\d+)\]/g)) {
    const idx = Number(match[1]) - 1;
    const mem = retrieved[idx];
    if (mem && !seen.has(mem.id)) {
      seen.add(mem.id);
      out.push(mem.id);
    }
  }
  return out;
}
