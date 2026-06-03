/**
 * Placeholder screen for routes that exist in the IA but are built in a later
 * phase of the rebuild. Keeps the sidebar fully navigable and avoids 404s
 * while /plugin, /chat, /overview, /memory, /sources, /settings come online.
 */
export function ComingSoon({
  eyebrow,
  title,
  body,
  cool,
}: {
  eyebrow: string;
  title: string;
  body: string;
  cool?: boolean;
}) {
  return (
    <section className="screen on">
      <div className={`eyebrow rise${cool ? " cool" : ""}`}>{eyebrow}</div>
      <h1 className="title rise">{title}</h1>
      <div className="lede rise">{body}</div>
      <div className="empty rise" style={{ marginTop: 8 }}>
        <div className="ei">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </div>
        <h3>Coming soon</h3>
        <p>This screen lands in an upcoming phase of the rebuild.</p>
      </div>
    </section>
  );
}
