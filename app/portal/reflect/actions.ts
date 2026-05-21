"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentMember } from "@/lib/db/members";
import {
  appendMessage,
  getOrCreateInterviewerConversation,
  listMessages,
} from "@/lib/db/conversations";
import { createMemory } from "@/lib/db/memories";
import { generateResponse } from "@/lib/models/generateResponse";
import {
  composeOnboardingPrompt,
  getInterviewerSystemPrompt,
  parseSeedMarker,
  type InterviewerMode,
} from "@/lib/prompts/interviewer";
import { SEED_QUESTIONS } from "@/lib/onboarding/questions";
import {
  getOnboardingState,
  recordQuestionAsked,
} from "@/lib/onboarding/state";
import { AppError, isAppError } from "@/lib/errors";
import { enforceMessageLimit } from "@/lib/limits";
import type { Message } from "@/lib/db/schema";
import type { ModelMessage } from "@/lib/models/types";

const MAX_TURNS_IN_CONTEXT = 24;

const inputSchema = z.object({
  content: z.string().trim().min(1, "Say something to send.").max(8000),
  mode: z.enum(["deep", "onboarding"]).optional(),
});

/**
 * Walk the conversation history backward to the most recent clone message
 * that contains a known seed-question text, then count member messages after
 * that point. Used to detect "answered current seed + one follow-up" so we
 * can force the next clone reply to advance.
 *
 * Substring matching is reliable because the prompt requires the model to
 * copy seed text verbatim from the list it's given.
 */
function countMemberAnswersSinceLastSeed(
  history: Array<{ role: "member" | "clone"; content: string }>,
): number {
  let anchor = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role !== "clone") continue;
    if (SEED_QUESTIONS.some((s) => m.content.includes(s.text))) {
      anchor = i;
      break;
    }
  }
  if (anchor < 0) return 0;
  let n = 0;
  for (let i = anchor + 1; i < history.length; i++) {
    if (history[i].role === "member") n++;
  }
  return n;
}

export type SendInterviewerMessageResult =
  | {
      ok: true;
      member: Message;
      clone: Message;
      /** Seed question id the Interviewer just advanced to, if any. */
      advancedSeedId?: string;
    }
  | { ok: false; error: string };

export async function sendInterviewerMessage(
  formData: FormData,
): Promise<SendInterviewerMessageResult> {
  try {
    const parsed = inputSchema.safeParse({
      content: formData.get("content"),
      mode: formData.get("mode") ?? undefined,
    });
    if (!parsed.success) {
      throw new AppError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const { content, mode } = parsed.data;
    const interviewerMode: InterviewerMode = mode ?? "deep";

    const member = await getCurrentMember();
    await enforceMessageLimit(member.id);
    const convo = await getOrCreateInterviewerConversation(member.id);

    // 1. Save the member's message.
    const memberMessage = await appendMessage({
      conversationId: convo.id,
      role: "member",
      content,
    });

    // 2. Embed and persist the message as a memory. The clone's reply is NOT
    //    saved as a memory (the corpus reflects the member, not the clone).
    await createMemory({
      memberId: member.id,
      sourceType: "chat",
      sourceId: null,
      content,
    });

    // 3. Compose the model context from the recent turns and generate a reply.
    const history = await listMessages(convo.id, { limit: MAX_TURNS_IN_CONTEXT });
    const modelMessages: ModelMessage[] = history.map((m) => ({
      role: m.role === "member" ? "user" : "assistant",
      content: m.content,
    }));

    // For onboarding mode, the system prompt includes the list of seeds the
    // member hasn't seen yet so the model can pick the next one inline. We
    // also detect when the member has already answered the current seed plus
    // one follow-up; at that point we switch to a force-advance prompt that
    // refuses to probe further.
    let system: string;
    if (interviewerMode === "onboarding") {
      const onboardingState = await getOnboardingState(member.id);
      const asked = new Set(onboardingState?.askedIndices ?? []);
      const remaining = SEED_QUESTIONS.filter((_, idx) => !asked.has(idx)).map(
        (s) => ({ id: s.id, text: s.text }),
      );
      const answersOnCurrentSeed = countMemberAnswersSinceLastSeed(history);
      const mustAdvance = answersOnCurrentSeed >= 2;
      system = composeOnboardingPrompt(remaining, { mustAdvance });
    } else {
      system = getInterviewerSystemPrompt(interviewerMode);
    }

    const reply = await generateResponse({
      system,
      messages: modelMessages,
      maxTokens: interviewerMode === "onboarding" ? 220 : 600,
      metadata: { memberId: member.id },
    });

    // In onboarding mode, parse out the [SEED:<id>] marker, record the
    // advancement, and save a clean message without the marker visible.
    let cloneContent = reply.content;
    let advancedSeedId: string | undefined;
    if (interviewerMode === "onboarding") {
      const parsed = parseSeedMarker(reply.content);
      if (parsed.seedId) {
        const idx = SEED_QUESTIONS.findIndex((s) => s.id === parsed.seedId);
        if (idx >= 0) {
          await recordQuestionAsked(member.id, idx);
          advancedSeedId = parsed.seedId;
          cloneContent = parsed.content;
        }
      }
    }

    const cloneMessage = await appendMessage({
      conversationId: convo.id,
      role: "clone",
      content: cloneContent,
    });

    revalidatePath("/portal/reflect");
    if (interviewerMode === "onboarding") {
      revalidatePath("/portal/onboarding");
    }
    return {
      ok: true,
      member: memberMessage,
      clone: cloneMessage,
      advancedSeedId,
    };
  } catch (err) {
    if (isAppError(err)) {
      return { ok: false, error: err.userMessage };
    }
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[reflect.sendInterviewerMessage]", err);
    // Surface the underlying detail while we're in private preview. Swap back
    // to a generic message before any external pilot.
    return { ok: false, error: `Server error: ${detail.slice(0, 240)}` };
  }
}
