import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";

/**
 * The Soultech app surface: warm-dark, two-column grid with a fixed sidebar
 * (collapses to a bottom icon nav under 860px via globals.css), a sticky
 * topbar, and the scrolling content well. Styling lives in the `.app` scope in
 * globals.css.
 */
export function AppShell({
  email,
  name,
  children,
}: {
  email: string;
  name?: string;
  children: ReactNode;
}) {
  return (
    <div className="app">
      <div className="glow" />
      <div className="grain" />
      <AppSidebar />
      <main className="main">
        <Topbar email={email} name={name} />
        <div className="wrap">{children}</div>
      </main>
    </div>
  );
}
