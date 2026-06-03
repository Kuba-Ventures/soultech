import { ComingSoon } from "@/components/app/ComingSoon";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <ComingSoon
      eyebrow="Chat"
      title="Talk to yourself."
      body="A version of you that remembers the important stuff and saves it automatically. The rebuilt chat lands in a later phase."
    />
  );
}
