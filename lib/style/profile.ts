import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { memories, members } from "@/lib/db/schema";
import { generateResponse } from "@/lib/models/generateResponse";
import { logAudit } from "@/lib/audit";

/**
 * Dynamic style profile extracted from the member's own writing. Stored in
 * members.settings.styleProfile so we don't need a new table for v1.
 */

const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const MIN_CHAT_MEMORIES_FOR_PROFILE = 20;
const REGEN_INTERVAL = 25;
const PROFILE_SOURCE_LIMIT = 80;

const EXTRACTION_SYSTEM = `You are extracting a person's distinctive voice from their own writing. Read the passages and produce a profile another writer could use to mimic them.

What to capture:
- Typical sentence length and rhythm.
- Vocabulary and phrasings they reach for repeatedly.
- Characteristic hedges, intensifiers, or fillers.
- How they structure a thought (linear, looping, parenthetical, declarative).
- Recurring topics, references, or analogies.
- Specific constructions that feel like theirs.

What not to do:
- Do not psychoanalyze the person.
- Do not list things in bullets.
- Do not quote them.
- Do not include disclaimers.

Output: a single paragraph under 220 words, second-person ("You tend to..."). Just the profile.`;

export type StyleProfile = {
  profile: string;
  generatedAt: string;
  memoriesAtGen: number;
};

type SettingsWithProfile = {
  styleProfile?: StyleProfile;
  [key: string]: unknown;
};

/**
 * Get the member's cached profile, regenerating if the corpus has grown
 * materially since the last extraction. Returns null when the corpus is too
 * thin to characterize a voice yet.
 */
export async function getOrRefreshStyleProfile(
  memberId: string,
): Promise<StyleProfile | null> {
  const db = getDb();
  const memberRow = await db
    .select()
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  if (memberRow.length === 0) return null;
  const settings = (memberRow[0].settings ?? {}) as SettingsWithProfile;
  const existing = settings.styleProfile;

  const chatCount = await countChatMemories(memberId);
  if (chatCount < MIN_CHAT_MEMORIES_FOR_PROFILE) return null;

  const stale =
    !existing || chatCount - existing.memoriesAtGen >= REGEN_INTERVAL;
  if (!stale && existing) return existing;

  const fresh = await extractStyleProfile(memberId, chatCount);
  if (!fresh) return existing ?? null;

  await db
    .update(members)
    .set({
      settings: { ...settings, styleProfile: fresh } satisfies SettingsWithProfile,
    })
    .where(eq(members.id, memberId));

  await logAudit({
    memberId,
    actor: "system",
    action: "style_profile.refreshed",
    details: { memoriesAtGen: fresh.memoriesAtGen, length: fresh.profile.length },
  });

  return fresh;
}

async function countChatMemories(memberId: string): Promise<number> {
  const db = getDb();
  // Cheap-ish count via raw select; corpus sizes here are small (< low thousands).
  const rows = await db
    .select({ id: memories.id })
    .from(memories)
    .where(
      and(
        eq(memories.memberId, memberId),
        eq(memories.sourceType, "chat"),
        eq(memories.redacted, false),
      ),
    );
  return rows.length;
}

async function extractStyleProfile(
  memberId: string,
  totalChatMemories: number,
): Promise<StyleProfile | null> {
  const db = getDb();
  const recent = await db
    .select({ content: memories.content })
    .from(memories)
    .where(
      and(
        eq(memories.memberId, memberId),
        eq(memories.sourceType, "chat"),
        eq(memories.redacted, false),
      ),
    )
    .orderBy(desc(memories.createdAt))
    .limit(PROFILE_SOURCE_LIMIT);

  const corpus = recent
    .map((r) => r.content.trim())
    .filter((c) => c.length > 0)
    .join("\n\n---\n\n");
  if (corpus.length < 400) return null;

  try {
    const resp = await generateResponse({
      model: HAIKU_MODEL,
      system: EXTRACTION_SYSTEM,
      messages: [{ role: "user", content: corpus }],
      maxTokens: 400,
    });
    const profile = resp.content.trim();
    if (!profile) return null;
    return {
      profile,
      generatedAt: new Date().toISOString(),
      memoriesAtGen: totalChatMemories,
    };
  } catch (err) {
    console.error("[style.extractStyleProfile]", err);
    return null;
  }
}
