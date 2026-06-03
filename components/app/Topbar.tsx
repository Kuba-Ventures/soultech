"use client";

import { usePathname } from "next/navigation";

const crumbs: Record<string, string> = {
  "/learn": "Learn · Accelerate",
  "/plugin": "Plug in",
  "/chat": "Chat",
  "/overview": "Overview",
  "/memory": "Memory",
  "/sources": "Sources",
  "/settings": "Settings",
};

function crumbFor(pathname: string | null): string {
  if (!pathname) return "";
  const key = Object.keys(crumbs).find(
    (k) => pathname === k || pathname.startsWith(`${k}/`),
  );
  return key ? crumbs[key] : "";
}

export function Topbar({ email }: { email: string }) {
  const pathname = usePathname();
  const initial = (email.trim()[0] || "?").toUpperCase();
  return (
    <div className="topbar">
      <div className="crumb">{crumbFor(pathname)}</div>
      <div className="who">
        <span>{email}</span>
        <span className="av">{initial}</span>
      </div>
    </div>
  );
}
