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
import { INTERVIEWER_SYSTEM_PROMPT } from "@/lib/prompts/interviewer";
import { AppError, isAppError } from "@/lib/errors";
import type { Message } from "@/lib/db/schema";
import type { ModelMessage } from "@/lib/models/types";

const MAX_TURNS_IN_CONTEXT = 24;

const inputSchema = z.object({
  content: z.string().trim().min(1, "Say something to send.").max(8000),
});

export type SendInterviewerMessageResult =
  | { ok: true; member: Message; clone: Message }
  | { ok: false; error: string };

export async function sendInterviewerMessage(
  formData: FormData,
): Promise<SendInterviewerMessageResult> {
  try {
    const parsed = inputSchema.safeParse({
      content: formData.get("content"),
    });
    if (!parsed.success) {
      throw new AppError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const { content } = parsed.data;

    const member = await getCurrentMember();
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

    const reply = await generateResponse({
      system: INTERVIEWER_SYSTEM_PROMPT,
      messages: modelMessages,
      maxTokens: 600,
      metadata: { memberId: member.id },
    });

    // 4. Save the clone's reply.
    const cloneMessage = await appendMessage({
      conversationId: convo.id,
      role: "clone",
      content: reply.content,
    });

    revalidatePath("/portal/reflect");
    return { ok: true, member: memberMessage, clone: cloneMessage };
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
