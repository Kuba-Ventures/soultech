"use client";

import { usePathname } from "next/navigation";
import { ProfileMenu } from "./ProfileMenu";

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

export function Topbar({ email, name }: { email: string; name?: string }) {
  const pathname = usePathname();
  return (
    <div className="topbar">
      <div className="crumb">{crumbFor(pathname)}</div>
      <ProfileMenu email={email} name={name} />
    </div>
  );
}
