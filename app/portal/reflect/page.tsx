import { getCurrentMember } from "@/lib/db/members";
import {
  getOrCreateInterviewerConversation,
  listMessages,
} from "@/lib/db/conversations";
import { InterviewerChat } from "@/components/portal/InterviewerChat";

export const dynamic = "force-dynamic";

export default async function ReflectPage() {
  const member = await getCurrentMember();
  const convo = await getOrCreateInterviewerConversation(member.id);
  const initialMessages = await listMessages(convo.id, { limit: 100 });

  return (
    <div className="h-full flex flex-col">
      <header className="px-8 pt-10 pb-4 max-w-3xl">
        <div className="text-xs uppercase tracking-[0.18em] text-white/40">
          Reflect
        </div>
        <h1 className="mt-2 text-3xl font-medium tracking-[-0.02em]">
          Talk to build your brain.
        </h1>
        <p className="mt-3 text-sm text-white/55 leading-relaxed">
          The Interviewer asks. You answer. Every reply you send becomes a
          memory your clone can use. Take your time.
        </p>
      </header>
      <InterviewerChat
        initialMessages={initialMessages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
