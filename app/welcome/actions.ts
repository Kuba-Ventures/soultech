"use server";

import { getCurrentMember } from "@/lib/db/members";
import { logAudit } from "@/lib/audit";
import { AppError, isAppError } from "@/lib/errors";
import { parseExport, parseText } from "@/lib/profile/v1/parse";
import {
  appendParsedProfile,
  markOnboardingV1Done,
} from "@/lib/profile/v1/store";
import { extractTextFromFile } from "@/lib/profile/v1/extractText";
import type { Profile } from "@/lib/profile/v1/types";

export type WizardImportResult =
  | { ok: true; profile: Profile; added: number }
  | { ok: false; error: string };

export type WizardFinishResult = { ok: true } | { ok: false; error: string };

/** Wizard step: paste a self-portrait export. Appends to the profile. */
export async function wizardPasteImport(input: {
  rawExport: string;
}): Promise<WizardImportResult> {
  try {
    const member = await getCurrentMember();
    const parsed = await parseExport(input.rawExport ?? "");
    const profile = await appendParsedProfile(member.id, parsed);
    await logAudit({
      memberId: member.id,
      actor: "member",
      action: "profile.v1.imported",
      targetType: "profile",
      details: { via: "wizard-paste", added: parsed.length },
    });
    return { ok: true, profile, added: parsed.length };
  } catch (err) {
    return fail(err, "Couldn't import that. Try again in a moment.");
  }
}

/** Wizard step: upload a document (.txt/.md/.pdf). Parses + appends. */
export async function wizardUploadDoc(formData: FormData): Promise<WizardImportResult> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new AppError("invalid_input", "Choose a file to upload.");
    }
    const member = await getCurrentMember();
    const text = await extractTextFromFile(file);
    const parsed = await parseText(text, { defaultSource: `upload: ${file.name}` });
    const profile = await appendParsedProfile(member.id, parsed);
    await logAudit({
      memberId: member.id,
      actor: "member",
      action: "profile.v1.imported",
      targetType: "profile",
      details: { via: "wizard-upload", filename: file.name, added: parsed.length },
    });
    return { ok: true, profile, added: parsed.length };
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
