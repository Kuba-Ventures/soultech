"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  tag?: { text: string; amber?: boolean };
};

type NavGroup = { group: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    group: "Accelerate",
    items: [
      {
        href: "/learn",
        label: "Learn",
        tag: { text: "core", amber: true },
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3 17l5-5 4 4 8-9" />
            <path d="M16 7h4v4" />
          </svg>
        ),
      },
      {
        href: "/plugin",
        label: "Plug in",
        tag: { text: "new" },
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M9 7V3M15 7V3M8 7h8v4a4 4 0 0 1-8 0zM12 15v6" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "Talk",
    items: [
      {
        href: "/chat",
        label: "Chat",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "Your profile",
    items: [
      {
        href: "/overview",
        label: "Overview",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
          </svg>
        ),
      },
      {
        href: "/memory",
        label: "Memory",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 12l4-2M12 12v4" />
          </svg>
        ),
      },
      {
        href: "/sources",
        label: "Sources",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 3v8M9 8l3 3 3-3M5 21h14v-6H5z" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "Account",
    items: [
      {
        href: "/settings",
        label: "Settings",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="3" />
            <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1l-.4-2.6H10l-.4 2.6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z" />
          </svg>
        ),
      },
    ],
  },
];

export function AppSidebar({ percent }: { percent: number }) {
  const pathname = usePathname();
  // Animate the bar up to the real value on mount (CSS width transition).
  const [barWidth, setBarWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBarWidth(percent), 80);
    return () => clearTimeout(t);
  }, [percent]);
  return (
    <aside className="side">
      <div className="brand">
        <span className="mark" />
        <b>Soultech</b>
      </div>

      {groups.map((g) => (
        <div key={g.group}>
          <div className="grp">{g.group}</div>
          {g.items.map((item) => {
            const active =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${active ? " active" : ""}`}
              >
                {item.icon}
                {item.label}
                {item.tag && (
                  <span className={`tag${item.tag.amber ? " amb" : ""}`}>
                    {item.tag.text}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="foot">
        <div className="prog">
          <div className="pl">
            <span>Profile</span>
            <b>{percent}%</b>
          </div>
          <div className="bar">
            <i style={{ width: `${barWidth}%` }} />
          </div>
        </div>
        <div className="privacy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          <div>
            <div className="h">Yours alone</div>
            <div className="s">Encrypted, owned by you. You set what each tool sees.</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
