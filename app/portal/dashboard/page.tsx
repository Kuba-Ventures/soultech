import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  Brain,
  MessagesSquare,
  Upload,
  Sparkles,
  Library,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { getCurrentMember } from "@/lib/db/members";
import { getCorpusStats } from "@/lib/db/stats";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentUser();
  const member = await getCurrentMember();
  const stats = await getCorpusStats(member.id);

  const first =
    user?.firstName ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0];

  const lastActivity = stats.lastActivity
    ? new Date(stats.lastActivity).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const styleProfile = (
    member.settings as
      | { styleProfile?: { generatedAt: string; memoriesAtGen: number } }
      | undefined
  )?.styleProfile;

  const empty = stats.total === 0 && stats.uploadsTotal === 0;

  return (
    <div className="px-8 py-12 max-w-4xl">
      <div className="text-xs uppercase tracking-[0.18em] text-white/40">
        Dashboard
      </div>
      <h1 className="mt-2 text-3xl sm:text-4xl font-medium tracking-[-0.02em]">
        {first ? `${first}'s brain.` : "Your brain."}
      </h1>
      <p className="mt-4 text-white/60 leading-relaxed">
        {empty
          ? "Nothing in here yet. Upload a document or start a reflection and your brain begins to fill in."
          : "Everything your clone has learned so far, at a glance."}
      </p>

      {(stats.uploadsProcessing > 0 || stats.uploadsFailed > 0) && (
        <div className="mt-6 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-xs text-white/60">
          {stats.uploadsProcessing > 0 && (
            <span className="mr-3">
              {stats.uploadsProcessing} upload
              {stats.uploadsProcessing === 1 ? "" : "s"} still processing.
            </span>
          )}
          {stats.uploadsFailed > 0 && (
            <span className="text-rose-300/80">
              {stats.uploadsFailed} upload
              {stats.uploadsFailed === 1 ? "" : "s"} failed.
            </span>
          )}
        </div>
      )}

      {/* Headline panels */}
      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Panel
          icon={Brain}
          label="Memories"
          value={stats.total}
          hint={
            stats.redacted > 0 ? `${stats.redacted} redacted` : "across your brain"
          }
        />
        <Panel
          icon={MessagesSquare}
          label="Conversations"
          value={stats.conversationsTotal}
          hint={`${stats.messagesTotal} messages`}
        />
        <Panel
          icon={Upload}
          label="Uploads"
          value={stats.uploadsTotal}
          hint="documents and audio"
        />
        <Panel
          icon={Library}
          label="From reflect"
          value={stats.bySource.chat}
          hint={`${stats.bySource.upload_doc + stats.bySource.upload_audio} from uploads`}
        />
      </div>

      {/* Status row */}
      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="text-[11px] uppercase tracking-wider text-white/40">
            Last activity
          </div>
          <div className="mt-1 text-white/85">
            {lastActivity ?? "No activity yet"}
          </div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="text-[11px] uppercase tracking-wider text-white/40">
            Voice profile
          </div>
          <div className="mt-1 text-white/85">
            {styleProfile
              ? `Ready (${styleProfile.memoriesAtGen} memories)`
              : "Not yet"}
          </div>
          {!styleProfile && (
            <div className="mt-1 text-xs text-white/40">
              Needs 20+ memories from reflect.
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-10 text-xs uppercase tracking-wider text-white/40">
        Pick up where you left off
      </div>
      <div className="mt-3 grid sm:grid-cols-3 gap-4">
        <ActionCard
          href="/portal/reflect"
          icon={Sparkles}
          title="Reflect"
          body="Answer a few prompts. Each one becomes a memory."
        />
        <ActionCard
          href="/portal/upload"
          icon={Upload}
          title="Upload"
          body="Drop in a document or voice memo to add more."
        />
        <ActionCard
          href="/portal/chat"
          icon={MessagesSquare}
          title="Chat"
          body="Talk with your clone and hear it in your voice."
        />
      </div>
    </div>
  );
}

function Panel({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
      <Icon size={18} strokeWidth={1.75} className="text-amber-400/80" />
      <div className="mt-4 text-3xl font-medium tracking-[-0.02em] tabular-nums">
        {value.toLocaleString()}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-white/40">
        {label}
      </div>
      <div className="mt-0.5 text-xs text-white/35">{hint}</div>
    </div>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/8 bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-white/15 transition"
    >
      <div className="flex items-center justify-between">
        <Icon size={16} strokeWidth={1.75} className="text-white/50" />
        <ArrowRight
          size={14}
          strokeWidth={1.75}
          className="text-white/20 group-hover:text-white/50 transition-colors"
        />
      </div>
      <div className="mt-4 text-sm font-medium">{title}</div>
      <p className="mt-1 text-xs text-white/50 leading-relaxed">{body}</p>
    </Link>
  );
}
