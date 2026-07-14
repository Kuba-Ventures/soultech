import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { members } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import type { ParsedItem } from "./parse";
import {
  isCategoryKey,
  type CategoryKey,
  type Profile,
  type ProfileItem,
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
      source: typeof o.source === "string" && o.source ? o.source : "import",
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

/** Delete all of the member's profile data. */
export async function deleteAllProfile(memberId: string): Promise<void> {
  const db = getDb();
  const settings = await readSettings(memberId);
  const next = { ...settings };
  delete next[SETTINGS_KEY];
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
): Promise<Profile> {
  const existing = await getProfile(memberId);
  const base = existing?.items ?? [];
  const added: ProfileItem[] = parsed.map((p) => ({
    id: randomUUID(),
    category: p.category,
    content: p.content,
    source: p.source,
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

export async function markOnboardingV1Done(memberId: string): Promise<void> {
  const db = getDb();
  const settings = await readSettings(memberId);
  await db
    .update(members)
    .set({ settings: { ...settings, [ONBOARDING_KEY]: true } })
    .where(eq(members.id, memberId));
}
