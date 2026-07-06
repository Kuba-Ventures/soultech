import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { learningStyles, members, type LearningTrait } from "@/lib/db/schema";
import { listMemories } from "@/lib/db/memories";
import { generateResponse } from "@/lib/models/generateResponse";

/**
 * Infer the member's learning style from their memories + the "How you learn
 * best" questionnaire, and upsert the learning_styles row that /learn renders.
 * Triggered when the learning questionnaire is saved.
 */
const MODEL = "claude-haiku-4-5-20251001";
const SYSTEM = `From notes about a person and a short questionnaire, infer HOW THEY LEARN BEST. Return ONLY compact JSON: {"summary":"2-3 sentences, second person, warm but direct, no em-dashes","traits":[{"key":"kebab-case","label":"2-4 words"}]} with 3 to 5 traits. Only assert what the inputs support.`;

export async function inferLearningStyle(memberId: string): Promise<void> {
  const db = getDb();
  const [m] = await db
    .select({ settings: members.settings })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  const settings = (m?.settings ?? {}) as Record<string, unknown>;
  const q = ((settings.questionnaires as Record<string, Record<string, string>>)
    ?.learning_style ?? {}) as Record<string, string>;
  const qText = Object.entries(q)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");

  const mems = await listMemories(memberId, { limit: 60 });
  const corpus = mems
    .filter((x) => x.type === "PREFERENCE" || x.type === "MEMORY")
    .map((x) => `- ${x.contentSummary}`)
    .join("\n");

  if (!qText && !corpus) return;

  try {
    const res = await generateResponse({
      model: MODEL,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Questionnaire: ${qText || "(none)"}\nNotes:\n${corpus || "(none)"}`,
        },
      ],
      maxTokens: 320,
      temperature: 0.4,
    });
    const match = res.content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : res.content);
    const summary = String(parsed.summary ?? "").trim();
    if (!summary) return;
    const traits: LearningTrait[] = Array.isArray(parsed.traits)
      ? parsed.traits.slice(0, 5).map((t: { key?: string; label?: string }) => ({
          key: String(t.key ?? t.label ?? "trait"),
          label: String(t.label ?? ""),
        }))
      : [];
    const now = new Date();
    await db
      .insert(learningStyles)
      .values({
        memberId,
        summary,
        traits,
        inferredFrom: [],
        modelVersion: "infer-v1",
        generatedAt: now,
      })
      .onConflictDoUpdate({
        target: learningStyles.memberId,
        set: { summary, traits, generatedAt: now, updatedAt: now },
      });
  } catch {
    /* leave any existing style in place */
  }
}
