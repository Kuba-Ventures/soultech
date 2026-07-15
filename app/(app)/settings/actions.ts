"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/db/members";
import { deleteAllChats } from "@/lib/db/conversations";
import { clearOnboardingV1Done } from "@/lib/profile/v1/store";
import { logAudit } from "@/lib/audit";
import { isAppError } from "@/lib/errors";

export type ResetChatsResult =
  | { ok: true; removed: number }
  | { ok: false; error: string };

export type RestartOnboardingResult = { ok: true } | { ok: false; error: string };

/** Remove all of the member's chat history (conversations + messages). */
export async function resetChatsAction(): Promise<ResetChatsResult> {
  try {
    const member = await getCurrentMember();
    const removed = await deleteAllChats(member.id);
    await logAudit({
      memberId: member.id,
      actor: "member",
      action: "chats.reset",
      details: { conversationsRemoved: removed },
    });
    revalidatePath("/chat");
    revalidatePath("/settings");
    return { ok: true, removed };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    console.error("[settings.resetChats]", err);
    return { ok: false, error: "Couldn't reset your chats. Try again." };
  }
}

/**
 * Clear the onboarding-done flag so the first-run wizard runs again. The
 * client navigates to /welcome?restart=1 afterward to force it even if a
 * profile already exists.
 */
export async function restartOnboardingAction(): Promise<RestartOnboardingResult> {
  try {
    const member = await getCurrentMember();
    await clearOnboardingV1Done(member.id);
    await logAudit({
      memberId: member.id,
      actor: "member",
      action: "onboarding.restarted",
    });
    revalidatePath("/welcome");
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    console.error("[settings.restartOnboarding]", err);
    return { ok: false, error: "Couldn't restart onboarding. Try again." };
  }
}
