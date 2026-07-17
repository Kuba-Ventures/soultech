import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { members } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import type { ParsedItem } from "./parse";
import {
  isCategoryKey,
  isSourceKind,
  type CategoryKey,
  type Profile,
  type ProfileItem,
  type SourceEntry,
} from "./types";

/**
 * Per-user persistence for the v1 structured profile.
 *
 * Stage 1 keeps the profile in `members.settings.profileV1` (a keyed store,
 * isolated per member) so we can ship and test the parse + hub without a
 * migration. The data model is the same `Profile` shape a dedicated table
 * would hold, so promoting this to its own table later is a storage swap, not
 * a schema change. Reads/writes go only through this module.
 */

const SETTINGS_KEY = "profileV1";

type StoredProfile = { items: ProfileItem[]; updatedAt: string };

async function readSettings(memberId: string): Promise<Record<string, unknown>> {
  const db = getDb();
  const [row] = await db
    .select({ settings: members.settings })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  return (row?.settings ?? {}) as Record<string, unknown>;
}

async function writeProfile(
  memberId: string,
  settings: Record<string, unknown>,
  stored: StoredProfile,
): Promise<void> {
  const db = getDb();
  await db
    .update(members)
    .set({ settings: { ...settings, [SETTINGS_KEY]: stored } })
    .where(eq(members.id, memberId));
}

/** Coerce whatever is stored back into a clean, validated ProfileItem[]. */
function normalizeItems(raw: unknown): ProfileItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ProfileItem[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (!isCategoryKey(o.category)) continue;
    if (typeof o.content !== "string" || !o.content) continue;
    items.push({
      id: typeof o.id === "string" && o.id ? o.id : randomUUID(),
      category: o.category,
      content: o.content,
      ...(typeof o.lead === "string" && o.lead ? { lead: o.lead } : {}),
      source: typeof o.source === "string" && o.source ? o.source : "import",
      ...(typeof o.sourceId === "string" && o.sourceId ? { sourceId: o.sourceId } : {}),
      ...(typeof o.frequency === "number" && Number.isFinite(o.frequency)
        ? { frequency: Math.trunc(o.frequency) }
        : {}),
    });
  }
  return items;
}

/** The member's current profile, or null if they haven't imported one yet. */
export async function getProfile(memberId: string): Promise<Profile | null> {
  const settings = await readSettings(memberId);
  const stored = settings[SETTINGS_KEY] as StoredProfile | undefined;
  if (!stored) return null;
  return {
    userId: memberId,
    items: normalizeItems(stored.items),
    updatedAt:
      typeof stored.updatedAt === "string" ? stored.updatedAt : new Date().toISOString(),
  };
}

/**
 * Replace the member's profile with a freshly parsed set of items. Each parsed
 * item gets a stable id here. Returns the persisted Profile.
 */
export async function saveParsedProfile(
  memberId: string,
  parsed: ParsedItem[],
): Promise<Profile> {
  const items: ProfileItem[] = parsed.map((p) => ({
    id: randomUUID(),
    category: p.category,
    content: p.content,
    ...(p.lead ? { lead: p.lead } : {}),
    source: p.source,
    ...(p.frequency != null ? { frequency: p.frequency } : {}),
  }));
  const updatedAt = new Date().toISOString();

  const settings = await readSettings(memberId);
  await writeProfile(memberId, settings, { items, updatedAt });

  return { userId: memberId, items, updatedAt };
}

/** Persist a full item list, stamping a fresh updatedAt. */
async function persistItems(memberId: string, items: ProfileItem[]): Promise<Profile> {
  const updatedAt = new Date().toISOString();
  const settings = await readSettings(memberId);
  await writeProfile(memberId, settings, { items, updatedAt });
  return { userId: memberId, items, updatedAt };
}

async function requireProfile(memberId: string): Promise<Profile> {
  const profile = await getProfile(memberId);
  if (!profile) {
    throw new AppError("not_found", "No profile to edit yet — import one first.");
  }
  return profile;
}

/** Edit one item's content. Editing marks the item as user-authored. */
export async function updateItemContent(
  memberId: string,
  itemId: string,
  content: string,
): Promise<Profile> {
  const trimmed = content.trim();
  if (!trimmed) throw new AppError("invalid_input", "An item can't be empty.");
  const profile = await requireProfile(memberId);
  if (!profile.items.some((it) => it.id === itemId)) {
    throw new AppError("not_found", "That item no longer exists.");
  }
  const items = profile.items.map((it) =>
    it.id === itemId ? { ...it, content: trimmed, source: "user-edited" } : it,
  );
  return persistItems(memberId, items);
}

/** Delete a single item. */
export async function deleteItem(memberId: string, itemId: string): Promise<Profile> {
  const profile = await requireProfile(memberId);
  const items = profile.items.filter((it) => it.id !== itemId);
  return persistItems(memberId, items);
}

/** Add a manually-authored item to a category. Source is "user-edited". */
export async function addItem(
  memberId: string,
  category: CategoryKey,
  content: string,
): Promise<Profile> {
  const trimmed = content.trim();
  if (!trimmed) throw new AppError("invalid_input", "An item can't be empty.");
  const profile = (await getProfile(memberId)) ?? {
    userId: memberId,
    items: [],
    updatedAt: new Date().toISOString(),
  };
  const items: ProfileItem[] = [
    ...profile.items,
    { id: randomUUID(), category, content: trimmed, source: "user-edited" },
  ];
  return persistItems(memberId, items);
}

/** Delete all of the member's profile data, including the sources registry. */
export async function deleteAllProfile(memberId: string): Promise<void> {
  const db = getDb();
  const settings = await readSettings(memberId);
  const next = { ...settings };
  delete next[SETTINGS_KEY];
  delete next[SOURCES_KEY];
  await db.update(members).set({ settings: next }).where(eq(members.id, memberId));
}

/**
 * Merge freshly parsed items into the member's existing profile (append, don't
 * replace). Used by the multi-step onboarding wizard, where paste + uploads
 * each add to the same profile.
 */
export async function appendParsedProfile(
  memberId: string,
  parsed: ParsedItem[],
  sourceId?: string,
): Promise<Profile> {
  const existing = await getProfile(memberId);
  const base = existing?.items ?? [];
  const added: ProfileItem[] = parsed.map((p) => ({
    id: randomUUID(),
    category: p.category,
    content: p.content,
    ...(p.lead ? { lead: p.lead } : {}),
    source: p.source,
    ...(sourceId ? { sourceId } : {}),
    ...(p.frequency != null ? { frequency: p.frequency } : {}),
  }));
  return persistItems(memberId, [...base, ...added]);
}

// First-run onboarding flag. Set once the member finishes or skips the wizard,
// so we don't re-gate them on every sign-in.
const ONBOARDING_KEY = "onboardingV1Done";

export async function isOnboardingV1Done(memberId: string): Promise<boolean> {
  const settings = await readSettings(memberId);
  return settings[ONBOARDING_KEY] === true;
}

// Cached profile header (portrait + trait tags). Keyed by the item count it
// was generated from, so summary.ts can tell when to regenerate.
const SUMMARY_KEY = "profileV1Summary";

export type ProfileSummaryCache = {
  portrait: string;
  traits: string[];
  atItemCount: number;
};

export async function getProfileSummaryCache(
  memberId: string,
): Promise<ProfileSummaryCache | null> {
  const settings = await readSettings(memberId);
  const raw = settings[SUMMARY_KEY] as ProfileSummaryCache | undefined;
  if (!raw || typeof raw.portrait !== "string" || !Array.isArray(raw.traits)) {
    return null;
  }
  return {
    portrait: raw.portrait,
    traits: raw.traits.filter((t): t is string => typeof t === "string"),
    atItemCount: typeof raw.atItemCount === "number" ? raw.atItemCount : 0,
  };
}

export async function saveProfileSummaryCache(
  memberId: string,
  data: ProfileSummaryCache,
): Promise<void> {
  const db = getDb();
  const settings = await readSettings(memberId);
  await db
    .update(members)
    .set({ settings: { ...settings, [SUMMARY_KEY]: data } })
    .where(eq(members.id, memberId));
}

export async function markOnboardingV1Done(memberId: string): Promise<void> {
  const db = getDb();
  const settings = await readSettings(memberId);
  await db
    .update(members)
    .set({ settings: { ...settings, [ONBOARDING_KEY]: true } })
    .where(eq(members.id, memberId));
}

/** Clear the onboarding-done flag so the first-run wizard shows again. */
export async function clearOnboardingV1Done(memberId: string): Promise<void> {
  const db = getDb();
  const settings = await readSettings(memberId);
  const next = { ...settings };
  delete next[ONBOARDING_KEY];
  await db.update(members).set({ settings: next }).where(eq(members.id, memberId));
}

// Lightweight chat calibration signals ("closer" / "not quite" taps). Stored
// raw for now; the full feedback loop (folding these back into the profile) is
// deferred. Bounded so the JSON blob can't grow without limit.
const CALIBRATION_KEY = "chatCalibrationV1";
const CALIBRATION_MAX = 200;

export type CalibrationSignal = "closer" | "not_quite";

export async function recordCalibration(
  memberId: string,
  signal: CalibrationSignal,
  excerpt: string,
): Promise<void> {
  const db = getDb();
  const settings = await readSettings(memberId);
  const prior = Array.isArray(settings[CALIBRATION_KEY])
    ? (settings[CALIBRATION_KEY] as unknown[])
    : [];
  const entry = { signal, excerpt: excerpt.slice(0, 280), at: new Date().toISOString() };
  const next = [...prior, entry].slice(-CALIBRATION_MAX);
  await db
    .update(members)
    .set({ settings: { ...settings, [CALIBRATION_KEY]: next } })
    .where(eq(members.id, memberId));
}

// ---------------------------------------------------------------------------
// Sources registry
//
// The list of sources a member has added (AI pastes, uploaded files, custom
// entries, live connections). Lives alongside the profile in members.settings.
// Profile items carry a sourceId back to these entries so removing a source
// cascade-deletes what it contributed.
// ---------------------------------------------------------------------------

const SOURCES_KEY = "sourcesV1";

function normalizeSources(raw: unknown): SourceEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: SourceEntry[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (typeof o.id !== "string" || !o.id) continue;
    if (!isSourceKind(o.kind)) continue;
    out.push({
      id: o.id,
      kind: o.kind,
      provider: typeof o.provider === "string" && o.provider ? o.provider : "custom",
      label: typeof o.label === "string" && o.label ? o.label : "Source",
      addedAt: typeof o.addedAt === "string" ? o.addedAt : new Date().toISOString(),
      ...(typeof o.fileName === "string" ? { fileName: o.fileName } : {}),
      ...(typeof o.fileUrl === "string" ? { fileUrl: o.fileUrl } : {}),
    });
  }
  return out;
}

export async function listSources(memberId: string): Promise<SourceEntry[]> {
  const settings = await readSettings(memberId);
  return normalizeSources(settings[SOURCES_KEY]);
}

/** Sources plus how many profile items each one contributed. */
export async function getSourcesWithCounts(
  memberId: string,
): Promise<Array<SourceEntry & { itemCount: number }>> {
  const settings = await readSettings(memberId);
  const sources = normalizeSources(settings[SOURCES_KEY]);
  const stored = settings[SETTINGS_KEY] as StoredProfile | undefined;
  const items = normalizeItems(stored?.items);
  const counts = new Map<string, number>();
  for (const it of items) {
    if (it.sourceId) counts.set(it.sourceId, (counts.get(it.sourceId) ?? 0) + 1);
  }
  return sources.map((s) => ({ ...s, itemCount: counts.get(s.id) ?? 0 }));
}

/** Add or update a source entry (upsert by id). Newest first. */
export async function recordSource(memberId: string, entry: SourceEntry): Promise<void> {
  const db = getDb();
  const settings = await readSettings(memberId);
  const rest = normalizeSources(settings[SOURCES_KEY]).filter((s) => s.id !== entry.id);
  await db
    .update(members)
    .set({ settings: { ...settings, [SOURCES_KEY]: [entry, ...rest] } })
    .where(eq(members.id, memberId));
}

/**
 * Remove a source and cascade-delete every profile item tagged with it, in a
 * single settings write. Returns the removed entry (so callers can clean up an
 * associated blob) and how many items went with it.
 */
export async function removeSource(
  memberId: string,
  sourceId: string,
): Promise<{ entry: SourceEntry | null; removedItems: number }> {
  const db = getDb();
  const settings = await readSettings(memberId);
  const sources = normalizeSources(settings[SOURCES_KEY]);
  const entry = sources.find((s) => s.id === sourceId) ?? null;
  const nextSources = sources.filter((s) => s.id !== sourceId);

  const stored = settings[SETTINGS_KEY] as StoredProfile | undefined;
  const items = normalizeItems(stored?.items);
  const keptItems = items.filter((it) => it.sourceId !== sourceId);
  const removedItems = items.length - keptItems.length;

  const nextSettings: Record<string, unknown> = { ...settings, [SOURCES_KEY]: nextSources };
  // Only touch the profile blob if it existed, so we don't materialize an
  // empty profile for a member who never had one.
  if (stored) {
    nextSettings[SETTINGS_KEY] = { items: keptItems, updatedAt: new Date().toISOString() };
  }

  await db.update(members).set({ settings: nextSettings }).where(eq(members.id, memberId));
  return { entry, removedItems };
}
