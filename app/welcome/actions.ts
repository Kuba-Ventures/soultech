"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { getCurrentMember } from "@/lib/db/members";
import { logAudit } from "@/lib/audit";
import { AppError, isAppError } from "@/lib/errors";
import { parseText, partitionBySensitivity } from "@/lib/profile/v1/parse";
import { aiSourceLabel, isAiSourceKey } from "@/lib/profile/v1/aiSources";
import {
  appendParsedProfile,
  getImportOutcome,
  getProfile,
  listSources,
  markOnboardingV1Done,
  recordImportOutcome,
  recordSource,
  type ImportOutcome,
} from "@/lib/profile/v1/store";
import type { SourceEntry } from "@/lib/profile/v1/types";
import {
  computeKnowledge,
  learnedSegments,
  remainingSegments,
  suggestImprovements,
  type LearnedSegment,
  type Suggestion,
} from "@/lib/profile/v1/knowledge";
import { extractTextFromFile } from "@/lib/profile/v1/extractText";

export type WizardImportResult = { ok: true } | { ok: false; error: string };

export type WizardFinishResult = { ok: true } | { ok: false; error: string };

export type WizardKnowledge = {
  percent: number;
  segments: LearnedSegment[];
  remaining: LearnedSegment[];
  suggestions: Suggestion[];
  /** Outcome of the member's most recent background import, if any. */
  lastImport: ImportOutcome | null;
};

/**
 * Parse + sensitivity-filter + append, AND register the source so the import
 * shows up (and stays removable) on the Sources page. This mirrors the /import
 * flow's `ingestAsSource`: record the source, then tag every item with its id.
 * Runs AFTER the response returns so the member isn't blocked on the (slow)
 * model call and can keep moving through the wizard. Errors here can't reach
 * the UI — they're logged; the profile simply won't gain those items.
 */
function queueImport(
  memberId: string,
  text: string,
  source: Omit<SourceEntry, "addedAt">,
): void {
  after(async () => {
    try {
      const parsed = await parseText(text, { defaultSource: source.provider });
      const { kept, dropped } = partitionBySensitivity(parsed);
      const entry: SourceEntry = { ...source, addedAt: new Date().toISOString() };
      await recordSource(memberId, entry);
      await appendParsedProfile(memberId, kept, entry.id);
      await logAudit({
        memberId,
        actor: "member",
        action: "profile.v1.imported",
        targetType: "source",
        details: {
          via: entry.provider,
          kind: entry.kind,
          added: kept.length,
          filtered: dropped.length,
        },
      });
      await recordImportOutcome(memberId, {
        status: kept.length > 0 ? "ok" : "empty",
        added: kept.length,
        label: source.label,
        ...(kept.length === 0
          ? {
              message:
                "We read that, but it was all personal detail we leave out. Try a source with more about how you communicate, think, or work.",
            }
          : {}),
        at: new Date().toISOString(),
      });
    } catch (err) {
      // Background parse can't return an error to the UI, so persist it for the
      // wizard to surface instead of failing silently.
      console.error("[welcome.queueImport]", err);
      await recordImportOutcome(memberId, {
        status: "error",
        added: 0,
        label: source.label,
        message: isAppError(err)
          ? err.userMessage
          : "Couldn't read that import. Try again, or a different source.",
        at: new Date().toISOString(),
      }).catch((e) => console.error("[welcome.queueImport.outcome]", e));
    }
  });
}

/**
 * Wizard: paste a self-portrait export. `provider` is the AI the member picked
 * (claude / chatgpt / gemini / other) so two exports stay distinct in Sources.
 * Reads in the background.
 */
export async function wizardPasteImport(input: {
  rawExport: string;
  provider: string;
}): Promise<WizardImportResult> {
  try {
    const member = await getCurrentMember();
    // Cheap validation up front so real errors still surface; the slow parse
    // is deferred to after().
    if (!isAiSourceKey(input.provider)) {
      return { ok: false, error: "Pick which AI this export is from first." };
    }
    const text = (input.rawExport ?? "").trim();
    if (!text) return { ok: false, error: "Paste your export first." };
    if (text.length > 100_000) {
      return { ok: false, error: "That's over the 100,000-character limit. Trim it." };
    }
    queueImport(member.id, text, {
      id: randomUUID(),
      kind: "ai",
      provider: input.provider,
      label: aiSourceLabel(input.provider),
    });
    return { ok: true };
  } catch (err) {
    return fail(err, "Couldn't start that import. Try again.");
  }
}

/** Wizard: upload a document (.txt/.md/.pdf). Text is extracted now (it's in
 *  the request); parsing runs in the background. */
export async function wizardUploadDoc(formData: FormData): Promise<WizardImportResult> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new AppError("invalid_input", "Choose a file to upload.");
    }
    const member = await getCurrentMember();
    // Extract synchronously — the file bytes only exist during this request.
    // (Throws a friendly error for empty/oversize/unsupported, which surfaces.)
    const text = await extractTextFromFile(file);
    queueImport(member.id, text, {
      id: randomUUID(),
      kind: "upload",
      provider: "file",
      label: file.name,
      fileName: file.name,
    });
    return { ok: true };
  } catch (err) {
    return fail(err, "Couldn't read that document. Try another file.");
  }
}

/**
 * Wizard: the current Learned % + top nudges, for the "Done" payoff. Imports
 * run in the background (see queueImport), so the wizard polls this a few times
 * as the parse lands and the number climbs. Never throws — a read hiccup just
 * yields 0% rather than blocking the finish screen.
 */
export async function wizardKnowledge(): Promise<WizardKnowledge> {
  try {
    const member = await getCurrentMember();
    const [profile, sources, lastImport] = await Promise.all([
      getProfile(member.id),
      listSources(member.id),
      getImportOutcome(member.id),
    ]);
    const items = profile?.items ?? [];
    const knowledge = computeKnowledge(items, sources);
    return {
      percent: knowledge.percent,
      segments: learnedSegments(knowledge),
      remaining: remainingSegments(knowledge),
      suggestions: suggestImprovements(items, sources),
      lastImport,
    };
  } catch (err) {
    console.error("[welcome.wizardKnowledge]", err);
    return { percent: 0, segments: [], remaining: [], suggestions: [], lastImport: null };
  }
}

/** Wizard: mark first-run onboarding complete (finish or skip). */
export async function wizardFinish(): Promise<WizardFinishResult> {
  try {
    const member = await getCurrentMember();
    await markOnboardingV1Done(member.id);
    return { ok: true };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    console.error("[welcome.wizardFinish]", err);
    return { ok: false, error: "Couldn't save your progress. Try again." };
  }
}

function fail(err: unknown, fallback: string): { ok: false; error: string } {
  if (isAppError(err)) return { ok: false, error: err.userMessage };
  console.error("[welcome.wizard]", err);
  return { ok: false, error: fallback };
}
