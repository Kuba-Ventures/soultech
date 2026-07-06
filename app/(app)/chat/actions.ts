"use server";

import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/db/members";
import { createMemory } from "@/lib/db/memories";
import { createChat } from "@/lib/db/conversations";
import { generateResponse } from "@/lib/models/generateResponse";

/** Start a fresh saved chat and open it. */
export async function startNewChat(): Promise<void> {
  const member = await getCurrentMember();
  const chat = await createChat(member.id);
  redirect(`/chat?c=${chat.id}`);
}

export type SavedChip = { type: "FACT" | "PLAN" | "PREFERENCE"; label: string };

const MODEL = "claude-haiku-4-5-20251001";
const SYSTEM = `Extract durable, worth-remembering items about the user from their message: clear FACTs, PLANs, or PREFERENCEs. Ignore chit-chat, questions, and anything transient. Return ONLY compact JSON: {"items":[{"type":"FACT|PLAN|PREFERENCE","body":"one sentence","label":"<=4 words"}]}. Empty array if nothing is worth saving.`;

/**
 * Auto-save: pull structured Fact/Plan/Preference items out of a chat message
 * and persist them as typed memories, returning chips to show inline. Runs
 * alongside the streaming reply; deliberately conservative (saves nothing when
 * unsure).
 */
export async function extractAndSave(message: string): Promise<SavedChip[]> {
  const text = message.trim();
  if (text.length < 8) return [];
  const member = await getCurrentMember();
  try {
    const res = await generateResponse({
      model: MODEL,
      system: SYSTEM,
      messages: [{ role: "user", content: text }],
      maxTokens: 300,
      temperature: 0,
    });
    const m = res.content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : res.content);
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const chips: SavedChip[] = [];
    for (const it of items.slice(0, 4)) {
      const type = ["FACT", "PLAN", "PREFERENCE"].includes(it?.type)
        ? (it.type as SavedChip["type"])
        : null;
      const body = String(it?.body ?? "").trim();
      if (!type || !body) continue;
      await createMemory({
        memberId: member.id,
        sourceType: "chat",
        content: body,
        type,
        typeSource: "chat-autosave",
        metadata: { autosave: true },
      });
      chips.push({ type, label: String(it.label ?? type) });
    }
    return chips;
  } catch {
    return [];
  }
}
