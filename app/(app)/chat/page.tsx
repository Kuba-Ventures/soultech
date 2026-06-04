import { getCurrentMember } from "@/lib/db/members";
import {
  getOrCreateReflectiveConversation,
  listMessages,
} from "@/lib/db/conversations";
import { getProfileCompleteness } from "@/lib/profile/completeness";
import { CloneChat } from "@/components/chat/CloneChat";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

const CHAT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
  </svg>
);

export default async function ChatPage() {
  const member = await getCurrentMember();
  const completeness = await getProfileCompleteness(member.id);
  const convo = await getOrCreateReflectiveConversation(member.id);
  const msgs = await listMessages(convo.id, { limit: 100 });

  const initialMessages = msgs.map((m) => ({
    id: m.id,
    role: m.role as "member" | "clone",
    content: m.content,
  }));

  const thin = completeness.isEmpty && initialMessages.length === 0;

  return (
    <section className="screen on">
      <div className="eyebrow rise">Chat</div>
      <h1 className="title rise">
        Talk to <em>yourself.</em>
      </h1>
      <div className="lede rise">
        A version of you that remembers the important stuff (plans, decisions,
        the detail you mentioned once) and saves it automatically.
      </div>

      {thin ? (
        <EmptyState
          icon={CHAT_ICON}
          title="Say something worth keeping."
          body="I'm thin on context right now, so I'll mostly ask questions back. The more you tell me, the more I sound like you."
          actions={[{ label: "Add a few sources first", href: "/sources" }]}
        />
      ) : null}

      <CloneChat initialMessages={initialMessages} />
    </section>
  );
}
