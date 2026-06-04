import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { members } from "@/lib/db/schema";
import { listMemories } from "@/lib/db/memories";
import { generateResponse } from "@/lib/models/generateResponse";

/**
 * The self-rewriting "who I think you are" portrait on /overview. Generated
 * from the member's memories (Haiku) and cached in members.settings; regenerated
 * once the corpus grows by REFRESH_DELTA so it stays current without a model
 * call on every page load. Returns null for a brand-new (empty) member.
 */
type Portrait = { summary: string; atMemoryCount: number; generatedAt: string };

const MODEL = "claude-haiku-4-5-20251001";
const REFRESH_DELTA = 5;

const SYSTEM = `You write a short second-person portrait of a person from notes about them. 2 to 3 sentences. Warm but direct, no fluff, no em-dashes. Speak as their personal AI ("You're a..."). Only assert what the notes support.`;

export async function getOrGeneratePortrait(
  memberId: string,
  memoryCount: number,
): Promise<string | null> {
  const db = getDb();
  const [m] = await db
    .select({ settings: members.settings })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  const settings = (m?.settings ?? {}) as Record<string, unknown>;
  const cached = settings.portrait as Portrait | undefined;

  if (cached && memoryCount - cached.atMemoryCount < REFRESH_DELTA) {
    return cached.summary;
  }
  if (memoryCount === 0) return cached?.summary ?? null;

  const rows = await listMemories(memberId, { limit: 60 });
  if (rows.length === 0) return cached?.summary ?? null;
  const corpus = rows.map((r) => `- [${r.type}] ${r.contentSummary}`).join("\n");

  try {
    const res = await generateResponse({
      model: MODEL,
      system: SYSTEM,
      messages: [
        { role: "user", content: `Notes about the person:\n${corpus}\n\nWrite the portrait.` },
      ],
      maxTokens: 220,
      temperature: 0.4,
    });
    const summary = res.content.trim();
    if (!summary) return cached?.summary ?? null;
    const portrait: Portrait = {
      summary,
      atMemoryCount: memoryCount,
      generatedAt: new Date().toISOString(),
    };
    await db
      .update(members)
      .set({ settings: { ...settings, portrait } })
      .where(eq(members.id, memberId));
    return summary;
  } catch {
    return cached?.summary ?? null;
  }
}
