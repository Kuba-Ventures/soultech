"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/db/members";
import { logAudit } from "@/lib/audit";
import { AppError, isAppError } from "@/lib/errors";
import {
  addItem,
  deleteAllProfile,
  deleteItem,
  updateItemContent,
} from "@/lib/profile/v1/store";
import { isCategoryKey } from "@/lib/profile/v1/types";
import type { Profile } from "@/lib/profile/v1/types";

export type ProfileMutationResult =
  | { ok: true; profile: Profile }
  | { ok: false; error: string };

export type DeleteAllResult = { ok: true } | { ok: false; error: string };

export async function updateProfileItem(input: {
  itemId: string;
  content: string;
}): Promise<ProfileMutationResult> {
  try {
    const member = await getCurrentMember();
    const profile = await updateItemContent(member.id, input.itemId, input.content ?? "");
    await logAudit({
      memberId: member.id,
      actor: "member",
      action: "profile.v1.item_edited",
      targetType: "profile_item",
      targetId: input.itemId,
    });
    revalidatePath("/profile");
    return { ok: true, profile };
  } catch (err) {
    return fail(err, "Couldn't save that edit. Try again.");
  }
}

export async function deleteProfileItem(input: {
  itemId: string;
}): Promise<ProfileMutationResult> {
  try {
    const member = await getCurrentMember();
    const profile = await deleteItem(member.id, input.itemId);
    await logAudit({
      memberId: member.id,
      actor: "member",
      action: "profile.v1.item_deleted",
      targetType: "profile_item",
      targetId: input.itemId,
    });
    revalidatePath("/profile");
    return { ok: true, profile };
  } catch (err) {
    return fail(err, "Couldn't delete that item. Try again.");
  }
}

export async function addProfileItem(input: {
  category: string;
  content: string;
}): Promise<ProfileMutationResult> {
  try {
    if (!isCategoryKey(input.category)) {
      throw new AppError("invalid_input", "Unknown category.");
    }
    const member = await getCurrentMember();
    const profile = await addItem(member.id, input.category, input.content ?? "");
    await logAudit({
      memberId: member.id,
      actor: "member",
      action: "profile.v1.item_added",
      targetType: "profile_item",
      details: { category: input.category },
    });
    revalidatePath("/profile");
    return { ok: true, profile };
  } catch (err) {
    return fail(err, "Couldn't add that item. Try again.");
  }
}

export async function deleteAllProfileData(): Promise<DeleteAllResult> {
  try {
    const member = await getCurrentMember();
    await deleteAllProfile(member.id);
    await logAudit({
      memberId: member.id,
      actor: "member",
      action: "profile.v1.deleted_all",
      targetType: "profile",
    });
    revalidatePath("/profile");
    return { ok: true };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    console.error("[profile.deleteAllProfileData]", err);
    return { ok: false, error: "Couldn't delete your data. Try again." };
  }
}

function fail(err: unknown, fallback: string): { ok: false; error: string } {
  if (isAppError(err)) return { ok: false, error: err.userMessage };
  console.error("[profile.action]", err);
  return { ok: false, error: fallback };
}
