import Link from "next/link";
import { getCurrentMember } from "@/lib/db/members";
import {
  getChat,
  getOrCreateReflectiveConversation,
  listChats,
  listMessages,
} from "@/lib/db/conversations";
import { CloneChat } from "@/components/chat/CloneChat";
import { startNewChat } from "@/app/(app)/chat/actions";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const member = await getCurrentMember();
  const { c } = await searchParams;

  const chats = await listChats(member.id);

  // Resolve the selected chat: the ?c param (if owned), else the most recent,
  // else the member's default rolling conversation (created on demand).
  let selected =
    (c ? await getChat(member.id, c) : null) ?? chats[0] ?? null;
  if (!selected) selected = await getOrCreateReflectiveConversation(member.id);

  // Make sure the selected chat appears in the rail even if just created.
  const rail = chats.some((x) => x.id === selected!.id)
    ? chats
    : [selected, ...chats];

  const msgs = await listMessages(selected.id, { limit: 100 });
  const initialMessages = msgs.map((m) => ({
    id: m.id,
    role: m.role as "member" | "clone",
    content: m.content,
  }));

  return (
    <section className="screen on">
      <div className="eyebrow rise">Chat</div>
      <h1 className="title rise">
        Talk to <em>yourself.</em>
      </h1>
      <div className="lede rise" style={{ marginBottom: 18 }}>
        A version of you that remembers the important stuff and saves it
        automatically. Every chat is kept.
      </div>

      <div className="chatbar rise">
        <form action={startNewChat}>
          <button type="submit" className="newchat">
            + New chat
          </button>
        </form>
        <div className="chatlist">
          {rail.map((chat) => (
            <Link
              key={chat.id}
              href={`/chat?c=${chat.id}`}
              className={`chatchip${chat.id === selected.id ? " on" : ""}`}
            >
              {chat.title}
            </Link>
          ))}
        </div>
      </div>

      <CloneChat
        key={selected.id}
        conversationId={selected.id}
        initialMessages={initialMessages}
      />
    </section>
  );
}
