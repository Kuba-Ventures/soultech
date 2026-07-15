import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getCurrentMember } from "@/lib/db/members";
import { getProfile } from "@/lib/profile/v1/store";
import { compileProfile } from "@/lib/compileProfile";
import { streamResponse } from "@/lib/models/streamResponse";
import { enforceMessageLimit } from "@/lib/limits";
import { logAudit } from "@/lib/audit";
import { isAppError } from "@/lib/errors";
import { stripEmDashes } from "@/lib/text";
import type { ModelMessage } from "@/lib/models/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODEL = "claude-opus-4-8";
const MAX_TURNS = 16;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(8000),
      }),
    )
    .min(1)
    .max(60),
});

/**
 * v1 personalized chat. Stateless: the client sends the running message
 * history; we load the member's ten-category profile, compile it into the
 * system prompt, and stream Claude's reply. NDJSON of {delta} events, then a
 * final {complete} carrying the em-dash-cleaned text.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let messages: ModelMessage[];
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid input" }),
        { status: 400 },
      );
    }
    if (parsed.data.messages.at(-1)?.role !== "user") {
      return new Response(JSON.stringify({ error: "Last message must be from you." }), {
        status: 400,
      });
    }
    messages = parsed.data.messages.slice(-MAX_TURNS);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const startedAt = Date.now();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const member = await getCurrentMember();
        await enforceMessageLimit(member.id);

        const profile = await getProfile(member.id);
        const system = compileProfile(profile);

        let full = "";
        let inputTokens = 0;
        let outputTokens = 0;
        for await (const event of streamResponse({
          model: MODEL,
          system,
          messages,
          maxTokens: 1200,
          metadata: { memberId: member.id },
        })) {
          if (event.type === "delta") {
            full += event.text;
            send({ type: "delta", text: event.text });
          } else if (event.type === "complete") {
            inputTokens = event.inputTokens;
            outputTokens = event.outputTokens;
          }
        }

        const cleaned = stripEmDashes(full);
        send({ type: "complete", content: cleaned });

        await logAudit({
          memberId: member.id,
          actor: "system",
          action: "chat.v1.turn",
          details: {
            profileItems: profile?.items.length ?? 0,
            replyLength: cleaned.length,
            inputTokens,
            outputTokens,
            latencyMs: Date.now() - startedAt,
          },
        }).catch((err) => console.error("[api.v1.chat.audit]", err));
      } catch (err) {
        const message = isAppError(err) ? err.userMessage : "Server error.";
        if (!isAppError(err)) console.error("[api.v1.chat]", err);
        send({ type: "error", message });
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
