"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items: Array<{ href: string; label: string; description: string }> = [
  { href: "/portal/reflect", label: "Reflect", description: "Talk to build your brain" },
  { href: "/portal/chat", label: "Chat", description: "Talk with your clone" },
  { href: "/portal/upload", label: "Upload", description: "Documents and audio" },
  { href: "/portal/memories", label: "Memories", description: "Browse and redact" },
  { href: "/portal/settings", label: "Settings", description: "Profile, brain, account" },
];

export function PortalNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col p-4 gap-1 text-sm">
      <div className="px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/35">
        Workspace
      </div>
      {items.map((item) => {
        const active =
          pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 transition ${
              active
                ? "bg-white/8 text-white"
                : "text-white/65 hover:text-white hover:bg-white/4"
            }`}
          >
            <div>{item.label}</div>
            <div className="text-[11px] text-white/35">{item.description}</div>
          </Link>
        );
      })}

      <div className="mt-6 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/35">
        Recent
      </div>
      <div className="px-3 py-2 text-[11px] text-white/35">
        No conversations yet.
      </div>
    </nav>
  );
}
