import Link from "next/link";
import type { ReactNode } from "react";

export type EmptyAction = {
  label: string;
  href: string;
  ghost?: boolean;
};

/**
 * The dashed empty-state block used across the app when a screen has no data
 * yet. Keyed off profile completeness by callers. Matches `.empty` in the
 * prototype.
 */
export function EmptyState({
  icon,
  title,
  body,
  actions,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  actions?: EmptyAction[];
}) {
  return (
    <div className="empty rise">
      <div className="ei">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {actions && actions.length > 0 && (
        <div className="row">
          {actions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className={`btn${a.ghost ? " ghost" : ""}`}
            >
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
