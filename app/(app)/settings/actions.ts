"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/db/members";
import { wipeMemberData, type WipeCounts } from "@/lib/db/reset";
import { clearOnboardingV1Done } from "@/lib/profile/v1/store";
import { logAudit } from "@/lib/audit";
import { isAppError } from "@/lib/errors";

export type ResetDataResult =
  | { ok: true; counts: WipeCounts }
  | { ok: false; error: string };

export type RestartOnboardingResult = { ok: true } | { ok: false; error: string };

/**
 * Wipe the account clean: chats, memories, sources, learning styles, tracks,
 * tool connections, the profile, and all settings. The account itself stays,
 * so the member starts fresh (and re-enters onboarding).
 */
export async function resetAllDataAction(): Promise<ResetDataResult> {
  try {
    const member = await getCurrentMember();
    const counts = await wipeMemberData(member.id);
    // Logged after the wipe so this single "reset" entry is the only audit row.
    await logAudit({
      memberId: member.id,
      actor: "member",
      action: "account.reset",
      details: { ...counts },
    });
    for (const path of ["/chat", "/talk", "/profile", "/memory", "/overview", "/settings"]) {
      revalidatePath(path);
    }
    return { ok: true, counts };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    console.error("[settings.resetAllData]", err);
    return { ok: false, error: "Couldn't reset your data. Try again." };
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
