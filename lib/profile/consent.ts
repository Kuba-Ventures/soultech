import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { members } from "@/lib/db/schema";
import { getOrCreatePrimaryConnection, setPrimaryScope } from "@/lib/db/tools";

/**
 * Explicit, revocable consent for sensitive data categories. Stored on the
 * member (not a tool), and enforced by the MCP server: a sensitive category is
 * denied unless consent exists. Granting consent also opens read on the primary
 * connection's scope so it becomes usable; revoking closes it again.
 */
export type SensitiveCategory = "health" | "financial" | "location";
export type SensitiveConsents = Record<SensitiveCategory, boolean>;

export async function getSensitiveConsents(
  memberId: string,
): Promise<SensitiveConsents> {
  const db = getDb();
  const [m] = await db
    .select({ settings: members.settings })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  const s = (m?.settings ?? {}) as Record<string, unknown>;
  const c = (s.sensitiveConsents ?? {}) as Partial<SensitiveConsents>;
  return {
    health: Boolean(c.health),
    financial: Boolean(c.financial),
    location: Boolean(c.location),
  };
}

export async function setSensitiveConsent(
  memberId: string,
  category: SensitiveCategory,
  value: boolean,
): Promise<void> {
  const db = getDb();
  const [m] = await db
    .select({ settings: members.settings })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  const s = (m?.settings ?? {}) as Record<string, unknown>;
  const consents = {
    ...((s.sensitiveConsents as object) ?? {}),
    [category]: value,
  };
  await db
    .update(members)
    .set({ settings: { ...s, sensitiveConsents: consents } })
    .where(eq(members.id, memberId));

  // Reflect into the primary connection scope so MCP reads can use it.
  await getOrCreatePrimaryConnection(memberId);
  await setPrimaryScope(memberId, category, "read", value);
  if (!value) await setPrimaryScope(memberId, category, "write", false);
}
