import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { members, type ToolConnection } from "@/lib/db/schema";
import { getProfileCompleteness } from "@/lib/profile/completeness";
import { getLearningStyle } from "@/lib/db/learningStyle";
import { listActiveTracks, advanceTrack } from "@/lib/db/tracks";
import { createMemory } from "@/lib/db/memories";
import { searchMemories } from "@/lib/retrieval/search";
import { requireScope } from "./scope";

export type ToolContext = { connection: ToolConnection; memberId: string };
type JsonSchema = Record<string, unknown>;

export type McpTool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  handler: (ctx: ToolContext, args: Record<string, unknown>) => Promise<unknown>;
};

const MEMORY_TYPES = ["FACT", "PLAN", "MEMORY", "PREFERENCE"] as const;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export const TOOLS: McpTool[] = [
  {
    name: "get_profile",
    description:
      "Get the owner's profile summary: identity and how complete their Soultech brain is.",
    inputSchema: { type: "object", properties: {} },
    handler: async ({ connection, memberId }) => {
      requireScope(connection, "profile", "read");
      const [m] = await getDb()
        .select({ email: members.email, createdAt: members.createdAt })
        .from(members)
        .where(eq(members.id, memberId))
        .limit(1);
      const c = await getProfileCompleteness(memberId);
      return {
        email: m?.email ?? null,
        memberSince: m?.createdAt ?? null,
        completenessPercent: c.percent,
        memoryCount: c.memoryCount,
        hasLearningStyle: c.hasLearningStyle,
        trackCount: c.trackCount,
      };
    },
  },
  {
    name: "get_learning_style",
    description:
      "Get how the owner learns best (their distilled learning style and traits). Use this to tailor explanations and suggestions to them.",
    inputSchema: { type: "object", properties: {} },
    handler: async ({ connection, memberId }) => {
      requireScope(connection, "learning_style", "read");
      const style = await getLearningStyle(memberId);
      if (!style) return { present: false };
      return { present: true, summary: style.summary, traits: style.traits };
    },
  },
  {
    name: "get_memories",
    description:
      "Search the owner's memories (facts, plans, preferences, notes) by meaning. Returns the most relevant entries.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to recall about the owner." },
        limit: { type: "number", description: "Max results (default 8)." },
      },
      required: ["query"],
    },
    handler: async ({ connection, memberId }, args) => {
      requireScope(connection, "memories", "read");
      const query = str(args.query);
      if (!query) return { results: [] };
      const limit = Math.min(20, Math.max(1, Number(args.limit) || 8));
      const found = await searchMemories(memberId, query, { limit });
      return {
        results: found.map((m) => ({
          summary: m.contentSummary,
          content: m.content.slice(0, 1200),
          source: m.sourceType,
          createdAt: m.createdAt,
        })),
      };
    },
  },
  {
    name: "get_tracks",
    description:
      "List the skills the owner is actively leveling up, with progress and the suggested next rep.",
    inputSchema: { type: "object", properties: {} },
    handler: async ({ connection, memberId }) => {
      requireScope(connection, "tracks", "read");
      const tracks = await listActiveTracks(memberId);
      return {
        tracks: tracks.map((t) => ({
          name: t.name,
          level: t.level,
          progress: Math.round(t.progress * 100),
          nextRep: t.nextRep,
        })),
      };
    },
  },
  {
    name: "save_memory",
    description:
      "Save a new memory about the owner (a fact, plan, preference, or note) so the brain stays current. Only call this when you learn something durable about them.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: [...MEMORY_TYPES] },
        body: { type: "string", description: "The memory, in one or two sentences." },
      },
      required: ["type", "body"],
    },
    handler: async ({ connection, memberId }, args) => {
      requireScope(connection, "memories", "write");
      const body = str(args.body).trim();
      if (!body) throw new Error("save_memory requires a non-empty body.");
      const type = (MEMORY_TYPES as readonly string[]).includes(str(args.type))
        ? (str(args.type) as (typeof MEMORY_TYPES)[number])
        : "MEMORY";
      const memory = await createMemory({
        memberId,
        sourceType: "chat",
        content: body,
        type,
        typeSource: "mcp",
        metadata: {
          mcp: true,
          connectionId: connection.id,
          tool: connection.tool,
        },
      });
      return { ok: true, id: memory.id, type };
    },
  },
  {
    name: "advance_track",
    description:
      "Nudge one of the owner's learning tracks forward after they make progress. delta is 0..1 (e.g. 0.04 for a small session).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Exact track name." },
        delta: { type: "number", description: "Progress to add, 0..1." },
        reason: { type: "string", description: "Why it advanced." },
      },
      required: ["name", "delta", "reason"],
    },
    handler: async ({ connection, memberId }, args) => {
      requireScope(connection, "tracks", "write");
      const name = str(args.name).trim();
      const delta = Number(args.delta);
      const reason = str(args.reason).trim() || "advanced via connected tool";
      if (!name || !Number.isFinite(delta)) {
        throw new Error("advance_track requires a track name and numeric delta.");
      }
      const updated = await advanceTrack(memberId, name, delta, reason, "mcp");
      if (!updated) {
        return { ok: false, error: `No active track named "${name}".` };
      }
      return {
        ok: true,
        name: updated.name,
        progress: Math.round(updated.progress * 100),
        level: updated.level,
      };
    },
  },
];

export const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));
