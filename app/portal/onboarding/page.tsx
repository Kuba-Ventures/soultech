import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/db/members";
import {
  getOrCreateInterviewerConversation,
  listMessages,
} from "@/lib/db/conversations";
import { getOnboardingState } from "@/lib/onboarding/state";
import { SEED_QUESTIONS, MIN_MESSAGES_TO_COMPLETE } from "@/lib/onboarding/questions";
import { OnboardingShell } from "@/components/portal/OnboardingShell";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const member = await getCurrentMember();
  const state = await getOnboardingState(member.id);

  if (state?.completedAt) {
    redirect("/portal");
  }

  const convo = await getOrCreateInterviewerConversation(member.id);
  const initialMessages = await listMessages(convo.id, { limit: 100 });
  const memberMessageCount = initialMessages.filter(
    (m) => m.role === "member",
  ).length;

  return (
    <OnboardingShell
      hasStarted={state !== null}
      askedIndices={state?.askedIndices ?? []}
      memberMessageCount={memberMessageCount}
      minMessagesToComplete={MIN_MESSAGES_TO_COMPLETE}
      questions={SEED_QUESTIONS}
      initialMessages={initialMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  );
}
