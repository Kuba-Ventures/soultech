/**
 * Phase 1 demo seed: gives one member a learning style + a few active tracks so
 * the populated /learn state is visible at the checkpoint. Idempotent.
 *
 * Run (DATABASE_URL must be set):
 *   DATABASE_URL="postgres://..." SEED_EMAIL="finley@qsbsrollover.com" \
 *     npx tsx scripts/seed-phase1-demo.ts
 *
 * This is demo data only; real learning styles and tracks are inferred from
 * memories + the MCP write-back loop in later phases.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../lib/db/client";
import {
  members,
  learningStyles,
  tracks,
  type LearningTrait,
} from "../lib/db/schema";

const EMAIL = process.env.SEED_EMAIL ?? "finley@qsbsrollover.com";

const TRAITS: LearningTrait[] = [
  { key: "hands-on", label: "Hands-on first" },
  { key: "depth", label: "Single-threaded depth" },
  { key: "morning", label: "Morning peak" },
  { key: "agents", label: "Learns by teaching agents" },
];

const SUMMARY =
  "You learn by building, not reading. You reach for a project before a tutorial and figure it out in the doing. You go deep on one thing at a time, delegate the rest, and you are sharpest in the morning. So I will not hand you docs. I will hand you the next thing to build.";

const DEMO_TRACKS = [
  {
    name: "Claude subagents & orchestration",
    level: "building" as const,
    progress: 0.62,
    progressNote: "62% · you've shipped working agents, next is reliability",
    nextRep:
      "Scaffold a 3-agent pipeline that hands off state, break it on purpose, then have me review where it failed. 25 min, this morning.",
  },
  {
    name: "Cursor + terminal workflows",
    level: "mastering" as const,
    progress: 0.8,
    progressNote: "80% · strong, gap is reusable prompt structure",
    nextRep:
      "Turn your last 3 Cursor sessions into one reusable project prompt, and I'll diff your phrasings and pull out the pattern.",
  },
  {
    name: "QSBS & rollover structuring",
    level: "beginner" as const,
    progress: 0.24,
    progressNote: "24% · new track, picked up from your notes",
    nextRep:
      "Map your own cap-table scenario and I'll quiz you on the 5-year and $75M tests until they're reflex.",
  },
];

async function main() {
  const db = getDb();
  const found = await db
    .select()
    .from(members)
    .where(eq(members.email, EMAIL))
    .limit(1);
  if (found.length === 0) {
    throw new Error(`No member with email ${EMAIL}. Sign in once, then re-run.`);
  }
  const memberId = found[0].id;
  const now = new Date();

  await db
    .insert(learningStyles)
    .values({
      memberId,
      summary: SUMMARY,
      traits: TRAITS,
      inferredFrom: [],
      modelVersion: "seed-phase1",
      generatedAt: now,
    })
    .onConflictDoUpdate({
      target: learningStyles.memberId,
      set: { summary: SUMMARY, traits: TRAITS, generatedAt: now, updatedAt: now },
    });

  for (const t of DEMO_TRACKS) {
    await db
      .insert(tracks)
      .values({ memberId, status: "active", ...t })
      .onConflictDoNothing({ target: [tracks.memberId, tracks.name] });
  }

  console.log(
    `Seeded learning style + ${DEMO_TRACKS.length} tracks for ${EMAIL}.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
