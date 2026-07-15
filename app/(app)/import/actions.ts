"use server";

import { randomUUID } from "node:crypto";
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
import { parseText, partitionBySensitivity } from "@/lib/profile/v1/parse";
import { extractTextFromFile } from "@/lib/profile/v1/extractText";
import {
  appendParsedProfile,
  getSourcesWithCounts,
  recordSource,
  removeSource,
} from "@/lib/profile/v1/store";
import { blobConfigured, deleteUserFile, putUserFile } from "@/lib/uploads/userFiles";
import type { SourceEntry } from "@/lib/profile/v1/types";

export type SourceWithCount = SourceEntry & { itemCount: number };

export type SourcesResult =
  | { ok: true; sources: SourceWithCount[]; added: number; filtered: number }
  | { ok: false; error: string };

export type RemoveResult =
  | { ok: true; sources: SourceWithCount[]; removedItems: number }
  | { ok: false; error: string };

export type ConnectResult =
  | { ok: true; sources: SourceWithCount[] }
  | { ok: false; error: string };

// One stable source entry per member for their Notion connection, so re-pulls
// don't pile up duplicate entries.
const NOTION_SOURCE_ID = "conn-notion";

function fail(err: unknown, fallback: string): { ok: false; error: string } {
  if (isAppError(err)) return { ok: false, error: err.userMessage };
  console.error("[sources]", err);
  return { ok: false, error: fallback };
}

/**
 * Parse arbitrary text into the profile under a new source, tagging every
 * resulting item with the source id so it can be removed as a unit.
 */
async function ingestAsSource(
  memberId: string,
  text: string,
  entry: Omit<SourceEntry, "addedAt">,
): Promise<{ added: number; filtered: number }> {
  const parsed = await parseText(text, { defaultSource: entry.provider });
  const { kept, dropped } = partitionBySensitivity(parsed);
  const source: SourceEntry = { ...entry, addedAt: new Date().toISOString() };
  await recordSource(memberId, source);
  await appendParsedProfile(memberId, kept, source.id);
  await logAudit({
    memberId,
    actor: "member",
    action: "profile.v1.imported",
    targetType: "source",
    details: { via: entry.provider, kind: entry.kind, added: kept.length, filtered: dropped.length },
  });
  return { added: kept.length, filtered: dropped.length };
}

/** Import a pasted AI export, labeled by which assistant it came from. */
export async function importProviderPaste(input: {
  provider: "claude" | "chatgpt" | "other";
  rawExport: string;
  label?: string;
}): Promise<SourcesResult> {
  try {
    const member = await getCurrentMember();
    const text = (input.rawExport ?? "").trim();
    if (!text) return { ok: false, error: "Paste your export first." };

    const label =
      input.label?.trim() ||
      (input.provider === "claude"
        ? "Claude export"
        : input.provider === "chatgpt"
          ? "ChatGPT export"
          : "AI export");

    const { added, filtered } = await ingestAsSource(member.id, text, {
      id: randomUUID(),
      kind: "ai",
      provider: input.provider,
      label,
    });

    const sources = await getSourcesWithCounts(member.id);
    revalidatePath("/import");
    return { ok: true, sources, added, filtered };
  } catch (err) {
    return fail(err, "Something went wrong importing that. Try again in a moment.");
  }
}

/** Add a free-form custom source: a label plus pasted text. */
export async function addCustomSource(input: {
  label: string;
  rawText: string;
}): Promise<SourcesResult> {
  try {
    const member = await getCurrentMember();
    const label = (input.label ?? "").trim();
    const text = (input.rawText ?? "").trim();
    if (!label) return { ok: false, error: "Give this source a name." };
    if (!text) return { ok: false, error: "Add some text for this source." };

    const { added, filtered } = await ingestAsSource(member.id, text, {
      id: randomUUID(),
      kind: "custom",
      provider: "custom",
      label,
    });

    const sources = await getSourcesWithCounts(member.id);
    revalidatePath("/import");
    return { ok: true, sources, added, filtered };
  } catch (err) {
    return fail(err, "Couldn't add that source. Try again.");
  }
}

/** Upload a document as a source: extract text, optionally store the raw file. */
export async function uploadFileSource(formData: FormData): Promise<SourcesResult> {
  try {
    const member = await getCurrentMember();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Choose a file to upload." };
    }

    // Extract text while we still have the bytes (only available in-request).
    const text = await extractTextFromFile(file);
    // Store the raw file if blob storage is configured (best-effort).
    const stored = await putUserFile(member.id, file);

    const { added, filtered } = await ingestAsSource(member.id, text, {
      id: randomUUID(),
      kind: "upload",
      provider: "file",
      label: file.name,
      fileName: file.name,
      ...(stored ? { fileUrl: stored.url } : {}),
    });

    const sources = await getSourcesWithCounts(member.id);
    revalidatePath("/import");
    return { ok: true, sources, added, filtered };
  } catch (err) {
    return fail(err, "Couldn't read that file. Try a .txt, .md, or .pdf.");
  }
}

/** Remove a source and everything it contributed (cascade + blob cleanup). */
export async function removeSourceAction(input: {
  sourceId: string;
}): Promise<RemoveResult> {
  try {
    const member = await getCurrentMember();
    const { entry, removedItems } = await removeSource(member.id, input.sourceId ?? "");

    // Clean up the stored file and, for the Notion connection, drop the token.
    if (entry?.fileUrl) await deleteUserFile(entry.fileUrl);
    if (entry?.id === NOTION_SOURCE_ID) await removeConnection(member.id, "notion");

    await logAudit({
      memberId: member.id,
      actor: "member",
      action: "source.removed",
      targetType: "source",
      details: { provider: entry?.provider, removedItems },
    });

    const sources = await getSourcesWithCounts(member.id);
    revalidatePath("/import");
    return { ok: true, sources, removedItems };
  } catch (err) {
    return fail(err, "Couldn't remove that source. Try again.");
  }
}

// --- Notion connection ------------------------------------------------------

/** Read the pages shared with the integration into the profile, in the background. */
function queueNotionPull(memberId: string): void {
  after(async () => {
    try {
      const token = await getConnectionToken(memberId, "notion");
      if (!token) return;
      const text = await pullNotionText(token);
      if (!text.trim()) return;
      const parsed = await parseText(text, { defaultSource: "notion" });
      const { kept, dropped } = partitionBySensitivity(parsed);
      await appendParsedProfile(memberId, kept, NOTION_SOURCE_ID);
      await logAudit({
        memberId,
        actor: "member",
        action: "profile.v1.imported",
        targetType: "source",
        details: { via: "notion", added: kept.length, filtered: dropped.length },
      });
    } catch (err) {
      console.error("[sources.queueNotionPull]", err);
    }
  });
}

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
    // Register the source now so it shows immediately; items fill in on pull.
    await recordSource(member.id, {
      id: NOTION_SOURCE_ID,
      kind: "connection",
      provider: "notion",
      label: check.name ? `Notion · ${check.name}` : "Notion",
      addedAt: new Date().toISOString(),
    });
    await logAudit({
      memberId: member.id,
      actor: "member",
      action: "connection.notion.connected",
      targetType: "connection",
    });

    queueNotionPull(member.id);
    const sources = await getSourcesWithCounts(member.id);
    revalidatePath("/import");
    return { ok: true, sources };
  } catch (err) {
    return fail(err, "Couldn't connect Notion. Try again in a moment.");
  }
}

/** Pull again from an already-connected Notion. */
export async function pullNotionAction(): Promise<ConnectResult> {
  try {
    const member = await getCurrentMember();
    const token = await getConnectionToken(member.id, "notion");
    if (!token) return { ok: false, error: "Connect Notion first." };
    queueNotionPull(member.id);
    const sources = await getSourcesWithCounts(member.id);
    return { ok: true, sources };
  } catch (err) {
    return fail(err, "Couldn't refresh from Notion. Try again.");
  }
}

/** Disconnect Notion (stop syncing). Keeps what it already added; remove the
 * source to delete that. */
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
    const sources = await getSourcesWithCounts(member.id);
    revalidatePath("/import");
    return { ok: true, sources };
  } catch (err) {
    return fail(err, "Couldn't disconnect. Try again.");
  }
}
