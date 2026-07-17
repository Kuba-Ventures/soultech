/**
 * Bring existing v1 profiles up to the current standard: a model-picked `lead`
 * on every item, and no em/en dashes in the content members read.
 *
 * New imports already get both (a lead at parse time, and stripEmDashes on the
 * content). Profiles imported earlier render fine (the UI derives a lead), but
 * this upgrades them so the emphasis matches new data and honors the hard
 * no-em-dash rule on text that's already stored.
 *
 * Two things happen per item, both idempotent:
 *   1. content: run stripEmDashes (same transform new imports get). No-op when
 *      the content is already clean.
 *   2. lead: fill it in when missing (model-picked, validated as a verbatim
 *      prefix, else derived the same way the UI does). Existing leads are kept
 *      when they're still a valid prefix of the cleaned content.
 * ids, sources, frequency, and updatedAt are left intact. Safe to re-run.
 *
 * Dry-run by default (prints what would change). Pass --apply to persist.
 *
 *   node --env-file=.env.local --experimental-strip-types \
 *     scripts/backfill-profile-leads.ts [--apply]
 */

import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import Anthropic from "@anthropic-ai/sdk";
import { members } from "../lib/db/schema.ts";
import { splitLead, type ProfileItem } from "../lib/profile/v1/types.ts";
import { stripEmDashes } from "../lib/text.ts";

const MODEL = "claude-sonnet-5";

const LEADS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    leads: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          index: { type: "integer" },
          lead: { type: "string" },
        },
        required: ["index", "lead"],
      },
    },
  },
  required: ["leads"],
} as const;

const SYSTEM = `You pick the opening phrase to visually emphasize in short profile statements.
For each numbered statement, return "lead": the exact opening of that statement to bold, a VERBATIM prefix of the statement (its literal first characters, not a paraphrase). Choose the shortest opening span that captures the core claim, roughly 2 to 8 words, cut at a natural boundary before any trailing qualifier. No trailing comma or period. Never use an em dash or en dash. Return one entry per input index.`;

/** Ask the model for a verbatim-prefix lead per statement. Order-independent (keyed by index). */
async function pickLeads(
  anthropic: Anthropic,
  contents: string[],
): Promise<Map<number, string>> {
  const numbered = contents.map((c, i) => `${i}. ${c}`).join("\n");
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 4_000,
    thinking: { type: "disabled" },
    output_config: { format: { type: "json_schema", schema: LEADS_SCHEMA } },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Statements:\n${numbered}\n\nReturn a lead for every index 0 through ${contents.length - 1}.`,
      },
    ],
  });
  const message = await stream.finalMessage();
  const text = message.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("");
  const parsed = JSON.parse(text) as { leads?: { index: number; lead: string }[] };
  const out = new Map<number, string>();
  for (const { index, lead } of parsed.leads ?? []) {
    if (typeof index === "number" && typeof lead === "string") out.set(index, lead.trim());
  }
  return out;
}

/**
 * A lead valid against `content` (a shorter verbatim prefix), else the UI's
 * derivation. `fromModel` reports which path was taken so a run can show how
 * many leads are model-picked vs derived.
 */
function resolveLead(
  content: string,
  candidate: string | undefined,
): { lead: string; fromModel: boolean } {
  const clean = candidate ? stripEmDashes(candidate) : "";
  if (clean && content.startsWith(clean) && clean.length < content.length) {
    return { lead: clean, fromModel: true };
  }
  return { lead: splitLead({ content }).lead, fromModel: false };
}

type StoredProfile = { items?: unknown; updatedAt?: unknown };

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");

  const db = drizzle(neon(url), { schema: { members } });
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log(apply ? "APPLY mode: writing changes.\n" : "DRY RUN, no writes. Pass --apply to persist.\n");

  const rows = await db
    .select({ id: members.id, email: members.email, settings: members.settings })
    .from(members);

  let membersTouched = 0;
  let leadsFilled = 0;
  let leadsFromModel = 0;
  let contentsCleaned = 0;

  for (const row of rows) {
    const settings = (row.settings ?? {}) as Record<string, unknown>;
    const stored = settings.profileV1 as StoredProfile | undefined;
    const items = Array.isArray(stored?.items) ? (stored.items as ProfileItem[]) : null;
    if (!items || items.length === 0) continue;

    // Items with no lead yet get a model-picked one. Ask the model against the
    // cleaned content so the returned prefix matches what we'll store.
    const needLead = items
      .map((it, i) => ({ it, i, clean: stripEmDashes(typeof it.content === "string" ? it.content : "") }))
      .filter(({ it, clean }) => clean.length > 0 && !it.lead);

    let picked = new Map<number, string>();
    if (needLead.length > 0) {
      try {
        picked = await pickLeads(anthropic, needLead.map(({ clean }) => clean));
      } catch (err) {
        console.warn(`  ${row.email}: model pass failed, using derived leads. (${(err as Error).message})`);
      }
    }
    const pickFor = new Map<number, string>(needLead.map(({ i }, k) => [i, picked.get(k) ?? ""]));

    let leadsForMember = 0;
    let modelForMember = 0;
    let cleanedForMember = 0;
    let firstSampleIdx = -1;

    const nextItems = items.map((it, i) => {
      const rawContent = typeof it.content === "string" ? it.content : "";
      if (!rawContent) return { ...it };
      const content = stripEmDashes(rawContent);
      if (content !== rawContent) cleanedForMember++;

      // Keep an existing lead when it survives cleaning; otherwise (or when
      // missing) resolve one. Only count items that gain a lead they lacked.
      const hadLead = typeof it.lead === "string" && it.lead.length > 0;
      const { lead, fromModel } = resolveLead(content, hadLead ? it.lead : pickFor.get(i));
      if (!hadLead && lead) {
        leadsForMember++;
        if (fromModel) modelForMember++;
        if (firstSampleIdx === -1) firstSampleIdx = i;
      }
      return { ...it, content, ...(lead ? { lead } : {}) };
    });

    if (leadsForMember === 0 && cleanedForMember === 0) continue;

    membersTouched++;
    leadsFilled += leadsForMember;
    leadsFromModel += modelForMember;
    contentsCleaned += cleanedForMember;
    console.log(
      `  ${row.email}: +${leadsForMember} lead${leadsForMember === 1 ? "" : "s"} (${modelForMember} model, ${leadsForMember - modelForMember} derived), ${cleanedForMember} content em-dash${cleanedForMember === 1 ? "" : "es"} stripped`,
    );
    if (firstSampleIdx >= 0) {
      const s = nextItems[firstSampleIdx];
      console.log(`      e.g. lead "${s.lead}" from: ${s.content.slice(0, 80)}...`);
    }

    if (apply) {
      // Preserve updatedAt: this backfill isn't a member-initiated change.
      const nextProfile = { ...stored, items: nextItems };
      await db
        .update(members)
        .set({ settings: { ...settings, profileV1: nextProfile } })
        .where(eq(members.id, row.id));
    }
  }

  console.log(
    `\n${apply ? "Wrote" : "Would write"}: ${leadsFilled} lead${leadsFilled === 1 ? "" : "s"} filled (${leadsFromModel} model, ${leadsFilled - leadsFromModel} derived), ${contentsCleaned} content${contentsCleaned === 1 ? "" : "s"} de-dashed, across ${membersTouched} member${membersTouched === 1 ? "" : "s"}.`,
  );
  if (!apply && membersTouched > 0) console.log("Re-run with --apply to persist.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
