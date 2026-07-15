"use server";

import { after } from "next/server";
import { getCurrentMember } from "@/lib/db/members";
import { logAudit } from "@/lib/audit";
import { AppError, isAppError } from "@/lib/errors";
import { parseText, partitionBySensitivity } from "@/lib/profile/v1/parse";
import {
  appendParsedProfile,
  markOnboardingV1Done,
} from "@/lib/profile/v1/store";
import { extractTextFromFile } from "@/lib/profile/v1/extractText";

export type WizardImportResult = { ok: true } | { ok: false; error: string };

export type WizardFinishResult = { ok: true } | { ok: false; error: string };

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
