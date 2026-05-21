import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getDb } from "./client";
import { members, type Member } from "./schema";
import { logAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";

/**
 * Resolve the current Clerk user to a Soultech member row. Creates the row
 * on first call. Safe to invoke from any server context inside the portal.
 */
export async function getCurrentMember(): Promise<Member> {
  const { userId } = await auth();
  if (!userId) throw new AppError("unauthorized", "Sign in required");

  const db = getDb();
  const existing = await db
    .select()
    .from(members)
    .where(eq(members.clerkId, userId))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  if (!email) {
    throw new AppError(
      "invalid_input",
      "Account is missing a primary email; finish setup before continuing.",
    );
  }

  const inserted = await db
    .insert(members)
    .values({ clerkId: userId, email })
    .returning();
  const member = inserted[0];

  await logAudit({
    memberId: member.id,
    actor: "system",
    action: "member.created",
    details: { email },
  });

  return member;
}
