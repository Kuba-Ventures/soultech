"use server";

import { after } from "next/server";
import { getCurrentMember } from "@/lib/db/members";
import { logAudit } from "@/lib/audit";
import { AppError, isAppError } from "@/lib/errors";
import { parseText, partitionBySensitivity } from "@/lib/profile/v1/parse";
import {
  appendParsedProfile,
  getProfile,
  listSources,
  markOnboardingV1Done,
} from "@/lib/profile/v1/store";
import {
  computeKnowledge,
  suggestImprovements,
  type Suggestion,
} from "@/lib/profile/v1/knowledge";
import { extractTextFromFile } from "@/lib/profile/v1/extractText";

export type WizardImportResult = { ok: true } | { ok: false; error: string };

export type WizardFinishResult = { ok: true } | { ok: false; error: string };

export type WizardKnowledge = { percent: number; suggestions: Suggestion[] };

/**
 * Parse + sensitivity-filter + append, run AFTER the response returns so the
 * member isn't blocked on the (slow) model call and can keep moving through
 * the wizard. Errors here can't reach the UI — they're logged; the profile
 * simply won't gain those items.
 */
function queueImport(memberId: string, text: string, source: string): void {
  after(async () => {
    try {
      const parsed = await parseText(text, { defaultSource: source });
      const { kept, dropped } = partitionBySensitivity(parsed);
      await appendParsedProfile(memberId, kept);
      await logAudit({
        memberId,
        actor: "member",
        action: "profile.v1.imported",
        targetType: "profile",
        details: { via: source, added: kept.length, filtered: dropped.length },
      });
    } catch (err) {
      console.error("[welcome.queueImport]", err);
    }
  });
}

/** Wizard: paste a self-portrait export. Reads in the background. */
export async function wizardPasteImport(input: {
  rawExport: string;
}): Promise<WizardImportResult> {
  try {
    const member = await getCurrentMember();
    // Cheap validation up front so real errors still surface; the slow parse
    // is deferred to after().
    const text = (input.rawExport ?? "").trim();
    if (!text) return { ok: false, error: "Paste your export first." };
    if (text.length > 100_000) {
      return { ok: false, error: "That's over the 100,000-character limit. Trim it." };
    }
    queueImport(member.id, text, "wizard-paste");
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
    queueImport(member.id, text, `upload: ${file.name}`);
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
    const [profile, sources] = await Promise.all([
      getProfile(member.id),
      listSources(member.id),
    ]);
    const items = profile?.items ?? [];
    return {
      percent: computeKnowledge(items).percent,
      suggestions: suggestImprovements(items, sources),
    };
  } catch (err) {
    console.error("[welcome.wizardKnowledge]", err);
    return { percent: 0, suggestions: [] };
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
