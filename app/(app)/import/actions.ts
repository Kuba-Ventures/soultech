"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/db/members";
import { logAudit } from "@/lib/audit";
import { AppError, isAppError } from "@/lib/errors";
import { parseExport } from "@/lib/profile/v1/parse";
import { saveParsedProfile } from "@/lib/profile/v1/store";
import type { Profile } from "@/lib/profile/v1/types";

export type ImportResult =
  | { ok: true; profile: Profile }
  | { ok: false; error: string };

/**
 * Stage 1 entry point: take a pasted self-portrait export, parse it into the
 * canonical ten-category schema, and persist it for the current member.
 */
export async function importPortraitAction(input: {
  rawExport: string;
}): Promise<ImportResult> {
  try {
    const member = await getCurrentMember();

    const parsed = await parseExport(input.rawExport ?? "");
    const profile = await saveParsedProfile(member.id, parsed);

    await logAudit({
      memberId: member.id,
      actor: "member",
      action: "profile.v1.imported",
      targetType: "profile",
      details: { itemCount: profile.items.length },
    });

    revalidatePath("/import");
    return { ok: true, profile };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    console.error("[import.importPortraitAction]", err);
    return {
      ok: false,
      error: "Something went wrong importing that. Try again in a moment.",
    };
  }
}
