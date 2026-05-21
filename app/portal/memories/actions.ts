"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentMember } from "@/lib/db/members";
import { redactMemory } from "@/lib/db/memories";
import { AppError, isAppError } from "@/lib/errors";

const redactSchema = z.object({
  memoryId: z.string().uuid("Invalid memory id"),
  reason: z.string().trim().max(500).optional(),
});

export type RedactResult = { ok: true } | { ok: false; error: string };

export async function redactMemoryAction(input: {
  memoryId: string;
  reason?: string;
}): Promise<RedactResult> {
  try {
    const parsed = redactSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(
        "invalid_input",
        parsed.error.issues[0]?.message ?? "Invalid input",
      );
    }
    const member = await getCurrentMember();
    await redactMemory(member.id, parsed.data.memoryId, parsed.data.reason);
    revalidatePath("/portal/memories");
    return { ok: true };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    console.error("[memories.redactMemoryAction]", err);
    return { ok: false, error: "Could not redact memory. Try again." };
  }
}
