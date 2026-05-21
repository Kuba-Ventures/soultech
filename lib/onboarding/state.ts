import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { members } from "@/lib/db/schema";

export type OnboardingState = {
  startedAt: string;
  completedAt?: string;
  /** Indices of SEED_QUESTIONS that have been asked, in order. */
  askedIndices: number[];
};

type SettingsShape = {
  onboarding?: OnboardingState;
  [key: string]: unknown;
};

export async function getOnboardingState(
  memberId: string,
): Promise<OnboardingState | null> {
  const db = getDb();
  const rows = await db
    .select({ settings: members.settings })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  return (rows[0]?.settings as SettingsShape | undefined)?.onboarding ?? null;
}

export async function ensureOnboardingStarted(
  memberId: string,
): Promise<OnboardingState> {
  const existing = await getOnboardingState(memberId);
  if (existing) return existing;
  const state: OnboardingState = {
    startedAt: new Date().toISOString(),
    askedIndices: [],
  };
  await mergeSettings(memberId, { onboarding: state });
  return state;
}

export async function recordQuestionAsked(
  memberId: string,
  index: number,
): Promise<OnboardingState> {
  const existing = (await getOnboardingState(memberId)) ?? {
    startedAt: new Date().toISOString(),
    askedIndices: [],
  };
  if (existing.completedAt) return existing;
  if (existing.askedIndices.includes(index)) return existing;
  const next: OnboardingState = {
    ...existing,
    askedIndices: [...existing.askedIndices, index],
  };
  await mergeSettings(memberId, { onboarding: next });
  return next;
}

export async function markOnboardingCompleted(
  memberId: string,
): Promise<OnboardingState> {
  const existing = (await getOnboardingState(memberId)) ?? {
    startedAt: new Date().toISOString(),
    askedIndices: [],
  };
  const next: OnboardingState = {
    ...existing,
    completedAt: existing.completedAt ?? new Date().toISOString(),
  };
  await mergeSettings(memberId, { onboarding: next });
  return next;
}

async function mergeSettings(
  memberId: string,
  patch: SettingsShape,
): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({ settings: members.settings })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  const current = (rows[0]?.settings as SettingsShape | undefined) ?? {};
  await db
    .update(members)
    .set({ settings: { ...current, ...patch } satisfies SettingsShape })
    .where(eq(members.id, memberId));
}
