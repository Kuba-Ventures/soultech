"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentMember } from "@/lib/db/members";
import {
  appendMessage,
  getOrCreateInterviewerConversation,
} from "@/lib/db/conversations";
import { SEED_QUESTIONS } from "@/lib/onboarding/questions";
import {
  ensureOnboardingStarted,
  markOnboardingCompleted,
  recordQuestionAsked,
} from "@/lib/onboarding/state";
import { AppError, isAppError } from "@/lib/errors";

const askSchema = z.object({
  index: z.number().int().min(0).max(SEED_QUESTIONS.length - 1),
});

export type OnboardingActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function askOnboardingQuestion(input: {
  index: number;
}): Promise<OnboardingActionResult> {
  try {
    const parsed = askSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("invalid_input", "Invalid question.");
    }
    const member = await getCurrentMember();
    await ensureOnboardingStarted(member.id);

    const convo = await getOrCreateInterviewerConversation(member.id);
    const seed = SEED_QUESTIONS[parsed.data.index];
    await appendMessage({
      conversationId: convo.id,
      role: "clone",
      content: seed.text,
    });
    await recordQuestionAsked(member.id, parsed.data.index);

    revalidatePath("/portal/onboarding");
    revalidatePath("/portal/reflect");
    return { ok: true };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    console.error("[onboarding.askOnboardingQuestion]", err);
    return { ok: false, error: "Could not load that question. Try again." };
  }
}

export async function completeOnboardingAction(): Promise<OnboardingActionResult> {
  try {
    const member = await getCurrentMember();
    await markOnboardingCompleted(member.id);
    revalidatePath("/portal");
    revalidatePath("/portal/onboarding");
    return { ok: true };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    console.error("[onboarding.completeOnboarding]", err);
    return { ok: false, error: "Could not finish onboarding. Try again." };
  }
}

export async function startOnboardingAction(): Promise<OnboardingActionResult> {
  try {
    const member = await getCurrentMember();
    await ensureOnboardingStarted(member.id);
    revalidatePath("/portal/onboarding");
    return { ok: true };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    console.error("[onboarding.start]", err);
    return { ok: false, error: "Could not start onboarding. Try again." };
  }
}
