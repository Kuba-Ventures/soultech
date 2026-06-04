"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/db/members";
import { getDb } from "@/lib/db/client";
import { members } from "@/lib/db/schema";
import {
  setSensitiveConsent,
  type SensitiveCategory,
} from "@/lib/profile/consent";
import { logAudit } from "@/lib/audit";

/** Grant or revoke consent for a sensitive category (unlocks it for the MCP server). */
export async function setConsentAction(
  category: SensitiveCategory,
  value: boolean,
): Promise<{ ok: boolean }> {
  const member = await getCurrentMember();
  await setSensitiveConsent(member.id, category, value);
  await logAudit({
    memberId: member.id,
    actor: "member",
    action: value ? "source.consent_granted" : "source.consent_revoked",
    targetType: "sensitive_category",
    targetId: category,
  });
  revalidatePath("/sources");
  return { ok: true };
}

/** Persist questionnaire answers (stored on the member; feeds completeness + inference). */
export async function saveQuestionnaireAction(
  slug: string,
  answers: Record<string, string>,
): Promise<{ ok: boolean }> {
  const member = await getCurrentMember();
  const db = getDb();
  const [m] = await db
    .select({ settings: members.settings })
    .from(members)
    .where(eq(members.id, member.id))
    .limit(1);
  const settings = (m?.settings ?? {}) as Record<string, unknown>;
  const questionnaires = {
    ...((settings.questionnaires as object) ?? {}),
    [slug]: answers,
  };
  await db
    .update(members)
    .set({ settings: { ...settings, questionnaires } })
    .where(eq(members.id, member.id));
  await logAudit({
    memberId: member.id,
    actor: "member",
    action: "questionnaire.saved",
    targetType: "questionnaire",
    targetId: slug,
    details: { fields: Object.keys(answers).length },
  });
  revalidatePath("/sources");
  revalidatePath("/learn");
  return { ok: true };
}
