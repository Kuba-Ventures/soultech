"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  members,
  memories,
  sources,
  conversations,
  messages,
  auditLog,
} from "@/lib/db/schema";
import { getCurrentMember } from "@/lib/db/members";
import { logAudit } from "@/lib/audit";
import { AppError, isAppError } from "@/lib/errors";

const deleteSchema = z.object({
  confirmEmail: z.string().trim().min(1, "Type your email to confirm."),
});

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

export type ResetCorpusResult =
  | {
      ok: true;
      counts: {
        memories: number;
        sources: number;
        conversations: number;
        messages: number;
        audit: number;
      };
    }
  | { ok: false; error: string };

/**
 * Wipe every byte of member data without deleting the account. After this
 * runs, settings are cleared so the next visit to /portal bounces into
 * onboarding from a truly clean slate.
 */
export async function resetCorpusAction(): Promise<ResetCorpusResult> {
  try {
    const { userId } = await auth();
    if (!userId) throw new AppError("unauthorized", "Sign in required");
    const member = await getCurrentMember();
    const db = getDb();

    const convoRows = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.memberId, member.id));
    const convoIds = convoRows.map((c) => c.id);

    let deletedMessages = 0;
    if (convoIds.length > 0) {
      const rows = await db
        .delete(messages)
        .where(inArray(messages.conversationId, convoIds))
        .returning({ id: messages.id });
      deletedMessages = rows.length;
    }

    const deletedConvos = await db
      .delete(conversations)
      .where(eq(conversations.memberId, member.id))
      .returning({ id: conversations.id });
    const deletedMemories = await db
      .delete(memories)
      .where(eq(memories.memberId, member.id))
      .returning({ id: memories.id });
    const deletedSources = await db
      .delete(sources)
      .where(eq(sources.memberId, member.id))
      .returning({ id: sources.id });
    const deletedAudit = await db
      .delete(auditLog)
      .where(eq(auditLog.memberId, member.id))
      .returning({ id: auditLog.id });

    await db
      .update(members)
      .set({ settings: {} })
      .where(eq(members.id, member.id));

    // Log the reset itself so there's a trail going forward.
    await logAudit({
      memberId: member.id,
      actor: "member",
      action: "corpus.reset",
      details: {
        memories: deletedMemories.length,
        sources: deletedSources.length,
        conversations: deletedConvos.length,
        messages: deletedMessages,
        audit: deletedAudit.length,
      },
    });

    revalidatePath("/portal");
    revalidatePath("/portal/settings");
    revalidatePath("/portal/onboarding");
    revalidatePath("/portal/memories");

    return {
      ok: true,
      counts: {
        memories: deletedMemories.length,
        sources: deletedSources.length,
        conversations: deletedConvos.length,
        messages: deletedMessages,
        audit: deletedAudit.length,
      },
    };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    console.error("[settings.resetCorpus]", err);
    return { ok: false, error: "Could not reset corpus. Try again." };
  }
}

export async function deleteAccountAction(input: {
  confirmEmail: string;
}): Promise<DeleteAccountResult> {
  try {
    const parsed = deleteSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(
        "invalid_input",
        parsed.error.issues[0]?.message ?? "Invalid input",
      );
    }

    const { userId } = await auth();
    if (!userId) throw new AppError("unauthorized", "Sign in required");
    const member = await getCurrentMember();

    if (
      parsed.data.confirmEmail.trim().toLowerCase() !==
      member.email.trim().toLowerCase()
    ) {
      throw new AppError(
        "invalid_input",
        "That email doesn't match your account.",
      );
    }

    // FK cascades wipe sources, memories, conversations, messages, audit_log.
    const db = getDb();
    await db.delete(members).where(eq(members.id, member.id));

    // Then tear down the Clerk user so the session ends and re-login starts
    // fresh (Clerk would otherwise still have a session pointing at no data).
    try {
      const client = await clerkClient();
      await client.users.deleteUser(userId);
    } catch (err) {
      // If Clerk fails, the local row is already gone. Log and continue;
      // the member can email support for full Clerk-side removal.
      console.error("[settings.deleteAccount] clerk delete failed", err);
    }

    return { ok: true };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    console.error("[settings.deleteAccount]", err);
    return { ok: false, error: "Could not delete account. Try again." };
  }
}
