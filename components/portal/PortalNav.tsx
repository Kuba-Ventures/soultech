"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  MessageSquare,
  Upload,
  Brain,
  Settings,
  Clock,
} from "lucide-react";

const items = [
  { href: "/portal/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/reflect", label: "Reflect", icon: Sparkles },
  { href: "/portal/chat", label: "Chat", icon: MessageSquare },
  { href: "/portal/upload", label: "Upload", icon: Upload },
  { href: "/portal/memories", label: "Memories", icon: Brain },
  { href: "/portal/settings", label: "Settings", icon: Settings },
];

export function PortalNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col px-3 py-4 gap-0.5 text-sm">
      <div className="px-3 pb-2 pt-1 text-[10px] uppercase tracking-[0.18em] text-white/30 select-none">
        Workspace
      </div>

      {items.map((item) => {
        const active =
          pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
              active
                ? "bg-white/[0.06] text-white"
                : "text-white/50 hover:text-white/80 hover:bg-white/[0.03]"
            }`}
          >
            {/* Left accent bar for active state */}
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-amber-400" />
            )}
            <Icon
              size={15}
              strokeWidth={1.75}
              className={`flex-shrink-0 transition-colors ${
                active ? "text-amber-400" : "text-white/35 group-hover:text-white/60"
              }`}
            />
            <span className={`font-medium ${active ? "text-white" : ""}`}>
              {item.label}
            </span>
          </Link>
        );
      })}

      <div className="mt-6 px-3 pb-2 pt-1 text-[10px] uppercase tracking-[0.18em] text-white/30 select-none">
        Recent
      </div>
      <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-white/25">
        <Clock size={12} strokeWidth={1.5} className="flex-shrink-0" />
        <span>No conversations yet.</span>
      </div>
    </nav>
  );
}
