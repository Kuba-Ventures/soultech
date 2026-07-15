"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/db/members";
import { logAudit } from "@/lib/audit";
import { AppError, isAppError } from "@/lib/errors";
import { connectionsConfigured } from "@/lib/connections/crypto";
import { pullNotionText, validateNotionToken } from "@/lib/connections/notion";
import {
  getConnectionToken,
  removeConnection,
  setConnection,
} from "@/lib/connections/store";
import { parseExport, parseText, partitionBySensitivity } from "@/lib/profile/v1/parse";
import { appendParsedProfile, saveParsedProfile } from "@/lib/profile/v1/store";
import type { Profile } from "@/lib/profile/v1/types";

export type ImportResult =
  | { ok: true; profile: Profile; filtered: number }
  | { ok: false; error: string };

/**
 * Stage 1 entry point: take a pasted self-portrait export, parse it into the
 * canonical ten-category schema, drop sensitive items, and persist the rest.
 */
export async function importPortraitAction(input: {
  rawExport: string;
}): Promise<ImportResult> {
  try {
    const member = await getCurrentMember();

    const parsed = await parseExport(input.rawExport ?? "");
    const { kept, dropped } = partitionBySensitivity(parsed);
    const profile = await saveParsedProfile(member.id, kept);

    await logAudit({
      memberId: member.id,
      actor: "member",
      action: "profile.v1.imported",
      targetType: "profile",
      details: { itemCount: profile.items.length, filtered: dropped.length },
    });

    revalidatePath("/import");
    return { ok: true, profile, filtered: dropped.length };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    console.error("[import.importPortraitAction]", err);
    return {
      ok: false,
      error: "Something went wrong importing that. Try again in a moment.",
    };
  }
}

export type ConnectResult = { ok: true } | { ok: false; error: string };

/**
 * Read the pages a member has shared with their Notion integration into the
 * profile, in the background (same non-blocking pattern as the wizard). Runs
 * after connect and on an explicit "pull again". Failures are logged, not
 * surfaced — the profile just doesn't gain those items.
 */
function queueNotionPull(memberId: string): void {
  after(async () => {
    try {
      const token = await getConnectionToken(memberId, "notion");
      if (!token) return;
      const text = await pullNotionText(token);
      if (!text.trim()) return;
      const parsed = await parseText(text, { defaultSource: "notion" });
      const { kept, dropped } = partitionBySensitivity(parsed);
      await appendParsedProfile(memberId, kept);
      await logAudit({
        memberId,
        actor: "member",
        action: "profile.v1.imported",
        targetType: "profile",
        details: { via: "notion", added: kept.length, filtered: dropped.length },
      });
    } catch (err) {
      console.error("[import.queueNotionPull]", err);
    }
  });
}

/** Connect Notion: validate the pasted token, store it encrypted, pull in the background. */
export async function connectNotionAction(input: {
  token: string;
}): Promise<ConnectResult> {
  try {
    if (!connectionsConfigured()) {
      return { ok: false, error: "Connections aren't turned on yet. Check back soon." };
    }
    const member = await getCurrentMember();
    const token = (input.token ?? "").trim();
    if (!token) return { ok: false, error: "Paste your Notion token first." };

    const check = await validateNotionToken(token);
    if (!check.ok) {
      return {
        ok: false,
        error: "That token didn't work. Copy it again from your Notion integration.",
      };
    }

    await setConnection(member.id, "notion", token, {
      workspace: check.name,
      connectedAt: new Date().toISOString(),
    });
    await logAudit({
      memberId: member.id,
      actor: "member",
      action: "connection.notion.connected",
      targetType: "connection",
    });

    queueNotionPull(member.id);
    revalidatePath("/import");
    return { ok: true };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    console.error("[import.connectNotionAction]", err);
    return { ok: false, error: "Couldn't connect Notion. Try again in a moment." };
  }
}

/** Pull again from an already-connected Notion. */
export async function pullNotionAction(): Promise<ConnectResult> {
  try {
    const member = await getCurrentMember();
    const token = await getConnectionToken(member.id, "notion");
    if (!token) return { ok: false, error: "Connect Notion first." };
    queueNotionPull(member.id);
    return { ok: true };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    console.error("[import.pullNotionAction]", err);
    return { ok: false, error: "Couldn't refresh from Notion. Try again." };
  }
}

/** Disconnect Notion: forget the token. Imported items stay in the profile. */
export async function disconnectNotionAction(): Promise<ConnectResult> {
  try {
    const member = await getCurrentMember();
    await removeConnection(member.id, "notion");
    await logAudit({
      memberId: member.id,
      actor: "member",
      action: "connection.notion.disconnected",
      targetType: "connection",
    });
    revalidatePath("/import");
    return { ok: true };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    console.error("[import.disconnectNotionAction]", err);
    return { ok: false, error: "Couldn't disconnect. Try again." };
  }
}
