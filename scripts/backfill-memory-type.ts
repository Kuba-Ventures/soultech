/**
 * One-time backfill: classify existing memories into FACT / PLAN / MEMORY /
 * PREFERENCE with Haiku so /memory chips are meaningful. Only touches rows that
 * were never classified (type_source IS NULL). Low-confidence stays MEMORY.
 * Idempotent and safe to re-run.
 *
 *   DATABASE_URL="postgres://..." ANTHROPIC_API_KEY="..." \
 *     npx tsx scripts/backfill-memory-type.ts
 */
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../lib/db/client";
import { memories } from "../lib/db/schema";
import { generateResponse } from "../lib/models/generateResponse";

const MODEL = "claude-haiku-4-5-20251001";
const LIMIT = 500;

const SYSTEM = `Classify a personal memory into exactly one type.
FACT: a stable, true statement about the person or world ("passport expires Jan 2027").
PREFERENCE: a like, dislike, taste, or how they work/learn ("learns by building, mornings").
PLAN: a future intention or goal ("3-week trip in the fall").
MEMORY: episodic, narrative, belief, or anything else (default).
Respond with ONLY compact JSON: {"type":"FACT|PLAN|MEMORY|PREFERENCE","confidence":0..1}`;

type Klass = "FACT" | "PLAN" | "MEMORY" | "PREFERENCE";

async function classify(content: string): Promise<{ type: Klass; confidence: number }> {
  const res = await generateResponse({
    model: MODEL,
    system: SYSTEM,
    messages: [{ role: "user", content: content.slice(0, 2000) }],
    maxTokens: 60,
    temperature: 0,
  });
  try {
    const m = res.content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : res.content);
    const type = ["FACT", "PLAN", "MEMORY", "PREFERENCE"].includes(parsed.type)
      ? (parsed.type as Klass)
      : "MEMORY";
    const confidence = Number(parsed.confidence);
    return { type, confidence: Number.isFinite(confidence) ? confidence : 0 };
  } catch {
    return { type: "MEMORY", confidence: 0 };
  }
}

async function main() {
  const db = getDb();
  const rows = await db
    .select({ id: memories.id, content: memories.content })
    .from(memories)
    .where(isNull(memories.typeSource))
    .limit(LIMIT);

  console.log(`Classifying ${rows.length} memories…`);
  let updated = 0;
  for (const row of rows) {
    const { type, confidence } = await classify(row.content);
    const finalType: Klass = confidence >= 0.6 ? type : "MEMORY";
    await db
      .update(memories)
      .set({ type: finalType, typeConfidence: confidence, typeSource: "backfill" })
      .where(eq(memories.id, row.id));
    updated += 1;
    if (updated % 20 === 0) console.log(`  ${updated}/${rows.length}`);
  }
  console.log(`Done. Classified ${updated} memories.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
