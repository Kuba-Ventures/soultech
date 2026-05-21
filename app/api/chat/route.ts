import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getCurrentMember } from "@/lib/db/members";
import {
  appendMessage,
  getOrCreateReflectiveConversation,
  listMessages,
} from "@/lib/db/conversations";
import { searchMemories, type RetrievedMemory } from "@/lib/retrieval/search";
import { detectPattern } from "@/lib/retrieval/patterns";
import { getOrRefreshStyleProfile } from "@/lib/style/profile";
import {
  buildReflectiveSystemPrompt,
  buildReflectiveUserMessage,
  parseAndRenumberCitations,
} from "@/lib/prompts/reflective";
import { streamResponse } from "@/lib/models/streamResponse";
import { logAudit } from "@/lib/audit";
import { AppError, isAppError } from "@/lib/errors";
import type { ModelMessage } from "@/lib/models/types";
import type { Citation } from "@/app/portal/chat/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.object({
  content: z.string().trim().min(1, "Say something to send.").max(8000),
});

const MAX_TURNS_IN_CONTEXT = 16;
const RETRIEVAL_LIMIT = 10;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  let content: string;
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: parsed.error.issues[0]?.message ?? "Invalid input",
        }),
        { status: 400 },
      );
    }
    content = parsed.data.content;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      };

      const turnStartedAt = Date.now();
      try {
        const member = await getCurrentMember();
        const convo = await getOrCreateReflectiveConversation(member.id);

        const memberMsg = await appendMessage({
          conversationId: convo.id,
          role: "member",
          content,
        });
        send({
          type: "member",
          id: memberMsg.id,
          content,
          createdAt: memberMsg.createdAt.toISOString(),
        });

        const [retrieved, styleProfile] = await Promise.all([
          searchMemories(member.id, content, { limit: RETRIEVAL_LIMIT }),
          getOrRefreshStyleProfile(member.id),
        ]);
        const pattern = await detectPattern(content, retrieved);

        const history = await listMessages(convo.id, {
          limit: MAX_TURNS_IN_CONTEXT,
        });
        const recentTurns = history.slice(0, -1).map((m) => ({
          role:
            m.role === "member" ? ("user" as const) : ("assistant" as const),
          content: m.content,
        }));
        const messages: ModelMessage[] = [
          ...recentTurns,
          {
            role: "user",
            content: buildReflectiveUserMessage(content, retrieved),
          },
        ];

        let fullText = "";
        let inputTokens = 0;
        let outputTokens = 0;
        for await (const event of streamResponse({
          system: buildReflectiveSystemPrompt({ styleProfile, pattern }),
          messages,
          maxTokens: 900,
          metadata: { memberId: member.id },
        })) {
          if (event.type === "delta") {
            fullText += event.text;
            send({ type: "delta", text: event.text });
          } else if (event.type === "complete") {
            inputTokens = event.inputTokens;
            outputTokens = event.outputTokens;
          }
        }

        const { content: cleanedContent, citationIds } =
          parseAndRenumberCitations(fullText, retrieved);

        const cloneMsg = await appendMessage({
          conversationId: convo.id,
          role: "clone",
          content: cleanedContent,
          citations: citationIds,
        });

        // Fire-and-forget telemetry. Stored in audit_log with the member's
        // own row so it's deletable when the member deletes their account.
        await logAudit({
          memberId: member.id,
          actor: "system",
          action: "chat.turn",
          targetType: "message",
          targetId: cloneMsg.id,
          details: {
            queryLength: content.length,
            retrievedIds: retrieved.map((m) => m.id),
            retrievedDistances: retrieved.map((m) => Number(m.distance.toFixed(4))),
            patternUsed: pattern !== null,
            styleProfileUsed: styleProfile !== null,
            citationCount: citationIds.length,
            replyLength: cleanedContent.length,
            inputTokens,
            outputTokens,
            latencyMs: Date.now() - turnStartedAt,
          },
        }).catch((err) => console.error("[api.chat.audit]", err));

        send({
          type: "complete",
          clone: {
            id: cloneMsg.id,
            content: cleanedContent,
            createdAt: cloneMsg.createdAt.toISOString(),
            citations: buildCitationDetails(citationIds, retrieved),
          },
        });
      } catch (err) {
        const userMessage = isAppError(err)
          ? err.userMessage
          : "Server error.";
        const detail = err instanceof Error ? err.message : String(err);
        if (!isAppError(err)) {
          console.error("[api.chat]", err);
        }
        send({ type: "error", message: userMessage, detail });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function buildCitationDetails(
  citationIds: string[],
  retrieved: RetrievedMemory[],
): Citation[] {
  const byId = new Map(retrieved.map((m) => [m.id, m]));
  return citationIds
    .map((id, idx): Citation | null => {
      const m = byId.get(id);
      if (!m) return null;
      return {
        id,
        label: `M${idx + 1}`,
        sourceType: m.sourceType,
        createdAt: m.createdAt.toISOString(),
        contentSummary: m.contentSummary,
        content: m.content,
      };
    })
    .filter((c): c is Citation => c !== null);
}

// silence unused warning for the AppError import (used by isAppError narrowing)
void AppError;
