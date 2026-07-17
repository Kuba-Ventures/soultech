/**
 * Backfill: wrap onboarding-imported profile items that were never attributed
 * to a source into a recovered "Self-portrait export" source, so they show up
 * (and become removable) on the Sources page.
 *
 * Background: before the fix in app/welcome/actions.ts, the onboarding wizard's
 * paste/upload wrote profile items with NO sourceId and recorded NO SourceEntry
 * (unlike the /import flow). Those items are "orphaned": they taught Soultech
 * but are invisible under "Your sources". This script adopts them into one
 * source per member.
 *
 * An item is an orphan iff it has no sourceId AND its provenance isn't
 * "user-edited" (hand-authored / edited items legitimately have no source and
 * must be left alone).
 *
 * Usage (dry-run prints what WOULD change, writes nothing):
 *   node --env-file=.env.local --experimental-strip-types \
 *     scripts/backfill-onboarding-sources.ts <email>
 *
 * Apply the change:
 *   node --env-file=.env.local --experimental-strip-types \
 *     scripts/backfill-onboarding-sources.ts <email> --apply
 */

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { members } from "../lib/db/schema.ts";
import type { ProfileItem, SourceEntry } from "../lib/profile/v1/types.ts";

const SETTINGS_KEY = "profileV1";
const SOURCES_KEY = "sourcesV1";

type StoredProfile = { items: ProfileItem[]; updatedAt: string };

async function main() {
  const email = process.argv[2];
  const apply = process.argv.includes("--apply");
  if (!email) {
    console.error(
      "Usage: scripts/backfill-onboarding-sources.ts <email> [--apply]",
    );
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const sql = neon(url);
  const db = drizzle(sql, { schema: { members } });

  const [row] = await db
    .select({ id: members.id, email: members.email, settings: members.settings })
    .from(members)
    .where(eq(members.email, email))
    .limit(1);

  if (!row) {
    console.error(`No member with email ${email}`);
    process.exit(1);
  }

  const settings = (row.settings ?? {}) as Record<string, unknown>;
  const stored = settings[SETTINGS_KEY] as StoredProfile | undefined;
  const items = Array.isArray(stored?.items) ? (stored!.items as ProfileItem[]) : [];
  const existingSources = Array.isArray(settings[SOURCES_KEY])
    ? (settings[SOURCES_KEY] as SourceEntry[])
    : [];

  const orphans = items.filter(
    (it) => !it.sourceId && it.source !== "user-edited",
  );

  console.log(`Member ${row.email} (${row.id})`);
  console.log(`  total profile items:   ${items.length}`);
  console.log(`  already attributed:    ${items.filter((i) => i.sourceId).length}`);
  console.log(`  hand-authored (kept):  ${items.filter((i) => i.source === "user-edited").length}`);
  console.log(`  orphans to adopt:      ${orphans.length}`);
  console.log(`  existing sources:      ${existingSources.length}`);

  if (orphans.length === 0) {
    console.log("Nothing to backfill.");
    return;
  }

  const entry: SourceEntry = {
    id: randomUUID(),
    kind: "ai",
    provider: "ai",
    label: "Self-portrait export (recovered)",
    addedAt: new Date().toISOString(),
  };

  const orphanIds = new Set(orphans.map((o) => o.id));
  const nextItems = items.map((it) =>
    orphanIds.has(it.id) ? { ...it, sourceId: entry.id } : it,
  );

  const nextSettings = {
    ...settings,
    [SETTINGS_KEY]: { items: nextItems, updatedAt: new Date().toISOString() },
    [SOURCES_KEY]: [entry, ...existingSources],
  };

  if (!apply) {
    console.log(
      `\nDRY RUN — would create source "${entry.label}" and attribute ${orphans.length} items to it.`,
    );
    console.log("Re-run with --apply to write.");
    return;
  }

  await db.update(members).set({ settings: nextSettings }).where(eq(members.id, row.id));
  console.log(
    `\nAPPLIED — created source "${entry.label}" (${entry.id}) and attributed ${orphans.length} items.`,
  );
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
