"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentMember } from "@/lib/db/members";
import {
  appendMessage,
  getOrCreateReflectiveConversation,
  listMessages,
} from "@/lib/db/conversations";
import { generateResponse } from "@/lib/models/generateResponse";
import { searchMemories } from "@/lib/retrieval/search";
import { detectPattern } from "@/lib/retrieval/patterns";
import { getOrRefreshStyleProfile } from "@/lib/style/profile";
import {
  buildReflectiveSystemPrompt,
  buildReflectiveUserMessage,
  parseCitations,
} from "@/lib/prompts/reflective";
import { AppError, isAppError } from "@/lib/errors";
import type { Message } from "@/lib/db/schema";
import type { ModelMessage } from "@/lib/models/types";

const MAX_TURNS_IN_CONTEXT = 16;
const RETRIEVAL_LIMIT = 10;

const inputSchema = z.object({
  content: z.string().trim().min(1, "Say something to send.").max(8000),
});

export type CitedMessage = {
  id: string;
  role: "member" | "clone";
  content: string;
  citations: Array<{
    id: string;
    label: string;
    sourceType: "chat" | "upload_doc" | "upload_audio" | "voice_memo";
    createdAt: string;
    contentSummary: string;
    content: string;
  }>;
  createdAt: string;
};

export type SendReflectiveResult =
  | { ok: true; member: CitedMessage; clone: CitedMessage }
  | { ok: false; error: string };

export async function sendReflectiveMessage(
  formData: FormData,
): Promise<SendReflectiveResult> {
  try {
    const parsed = inputSchema.safeParse({ content: formData.get("content") });
    if (!parsed.success) {
      throw new AppError(
        "invalid_input",
        parsed.error.issues[0]?.message ?? "Invalid input",
      );
    }
    const { content } = parsed.data;

    const member = await getCurrentMember();
    const convo = await getOrCreateReflectiveConversation(member.id);

    // 1. Persist the member's message (reflective-chat messages are NOT
    //    stored as memories; that's the Interviewer's job).
    const memberRow = await appendMessage({
      conversationId: convo.id,
      role: "member",
      content,
    });

    // 2. Retrieve memories, run the style + pattern passes in parallel.
    const [retrieved, styleProfile] = await Promise.all([
      searchMemories(member.id, content, { limit: RETRIEVAL_LIMIT }),
      getOrRefreshStyleProfile(member.id),
    ]);
    const pattern = await detectPattern(content, retrieved);

    // 3. Build model context from recent turns + retrieval-wrapped user msg.
    const history = await listMessages(convo.id, { limit: MAX_TURNS_IN_CONTEXT });
    const recentTurns = history.slice(0, -1).map((m) => ({
      role: m.role === "member" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));
    const messages: ModelMessage[] = [
      ...recentTurns,
      { role: "user", content: buildReflectiveUserMessage(content, retrieved) },
    ];

    // 4. Call Claude with the composed system prompt (base + style + pattern).
    const reply = await generateResponse({
      system: buildReflectiveSystemPrompt({ styleProfile, pattern }),
      messages,
      maxTokens: 900,
      metadata: { memberId: member.id },
    });

    // 5. Parse citation markers; persist the clone message with citation IDs.
    const citationIds = parseCitations(reply.content, retrieved);
    const cloneRow = await appendMessage({
      conversationId: convo.id,
      role: "clone",
      content: reply.content,
      citations: citationIds,
    });

    revalidatePath("/portal/chat");

    return {
      ok: true,
      member: serializeMessage(memberRow, []),
      clone: serializeMessage(cloneRow, retrieved.filter((m) => citationIds.includes(m.id))),
    };
  } catch (err) {
    if (isAppError(err)) return { ok: false, error: err.userMessage };
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[chat.sendReflectiveMessage]", err);
    return { ok: false, error: `Server error: ${detail.slice(0, 240)}` };
  }
}

function serializeMessage(
  msg: Message,
  retrieved: Array<{
    id: string;
    content: string;
    contentSummary: string;
    sourceType: "chat" | "upload_doc" | "upload_audio" | "voice_memo";
    createdAt: Date;
  }>,
): CitedMessage {
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    createdAt: msg.createdAt.toISOString(),
    citations: retrieved.map((m, idx) => ({
      id: m.id,
      label: `M${idx + 1}`,
      sourceType: m.sourceType,
      createdAt: m.createdAt.toISOString(),
      contentSummary: m.contentSummary,
      content: m.content,
    })),
  };
}
