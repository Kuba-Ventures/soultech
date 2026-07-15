"use server";

import { getCurrentMember } from "@/lib/db/members";
import { recordCalibration, type CalibrationSignal } from "@/lib/profile/v1/store";
import { isAppError } from "@/lib/errors";

export type CalibrationResult = { ok: true } | { ok: false; error: string };

/**
 * Store a single "closer / not quite" calibration tap. The full feedback loop
 * (folding these back into the profile) is deferred — for now we just capture
 * the signal.
 */
export async function recordCalibrationAction(input: {
  signal: CalibrationSignal;
  excerpt: string;
}): Promise<CalibrationResult> {
  try {
    if (input.signal !== "closer" && input.signal !== "not_quite") {
      return { ok: false, error: "Unknown signal." };
    }
    const member = await getCurrentMember();
    await recordCalibration(member.id, input.signal, input.excerpt ?? "");
    return { ok: true };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    console.error("[talk.recordCalibration]", err);
    return { ok: false, error: "Couldn't record that." };
  }
}
