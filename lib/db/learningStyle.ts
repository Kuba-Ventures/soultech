import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { learningStyles, type LearningStyle } from "./schema";

/**
 * The member's distilled learning style (one row per member), or null when it
 * hasn't been inferred yet. Powers the amber "Your learning style, distilled"
 * card on /learn; inference + write happen in a later phase.
 */
export async function getLearningStyle(
  memberId: string,
): Promise<LearningStyle | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(learningStyles)
    .where(eq(learningStyles.memberId, memberId))
    .limit(1);
  return rows[0] ?? null;
}
