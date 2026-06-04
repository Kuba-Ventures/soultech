import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";

/**
 * The Soultech v4 app surface: warm-dark, learn-first. Two-column grid with a
 * fixed sidebar (collapses to a bottom icon nav under 860px via globals.css),
 * a sticky topbar, and the scrolling content well. Styling lives in the `.app`
 * scope in globals.css, ported from design/soultech.html.
 */
export function AppShell({
  email,
  name,
  percent,
  children,
}: {
  email: string;
  name?: string;
  percent: number;
  children: ReactNode;
}) {
  return (
    <div className="app">
      <div className="glow" />
      <div className="grain" />
      <AppSidebar percent={percent} />
      <main className="main">
        <Topbar email={email} name={name} />
        <div className="wrap">{children}</div>
      </main>
    </div>
  );
}
