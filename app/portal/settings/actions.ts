"use server";

import { eq } from "drizzle-orm";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { members } from "@/lib/db/schema";
import { getCurrentMember } from "@/lib/db/members";
import { AppError, isAppError } from "@/lib/errors";

const deleteSchema = z.object({
  confirmEmail: z.string().trim().min(1, "Type your email to confirm."),
});

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

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
