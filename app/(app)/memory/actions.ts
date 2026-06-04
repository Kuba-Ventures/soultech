"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/db/members";
import { redactMemory } from "@/lib/db/memories";

/** Redact a memory: hidden from the clone (and MCP reads), kept for the owner. */
export async function redactMemoryAction(
  memoryId: string,
): Promise<{ ok: boolean }> {
  const member = await getCurrentMember();
  await redactMemory(member.id, memoryId);
  revalidatePath("/memory");
  return { ok: true };
}
