import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { brand } from "@/lib/brand";
import { PortalNav } from "./PortalNav";

type Props = {
  email: string;
  children: React.ReactNode;
};

export function PortalShell({ email, children }: Props) {
  return (
    <div className="min-h-screen bg-ink text-white grid grid-cols-[260px_1fr] grid-rows-[64px_1fr]">
      <header className="col-span-2 row-start-1 row-end-2 flex items-center justify-between border-b border-white/8 px-6">
        <Link href="/portal" className="text-sm font-medium tracking-tight">
          {brand.shortName}
        </Link>
        <div className="flex items-center gap-4 text-xs text-white/50">
          <span className="hidden sm:inline">{email}</span>
          <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
        </div>
      </header>

      <aside className="row-start-2 row-end-3 col-start-1 col-end-2 border-r border-white/8 overflow-y-auto">
        <PortalNav />
      </aside>

      <main className="row-start-2 row-end-3 col-start-2 col-end-3 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
