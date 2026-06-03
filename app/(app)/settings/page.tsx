import { ComingSoon } from "@/components/app/ComingSoon";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <ComingSoon
      eyebrow="Settings"
      title="Profile & account."
      body="Account details and the ownership, privacy, and per-tool scope controls land in a later phase."
    />
  );
}
