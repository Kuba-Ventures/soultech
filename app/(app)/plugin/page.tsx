import { getCurrentMember } from "@/lib/db/members";
import {
  getOrCreatePrimaryConnection,
  mcpEndpointUrl,
} from "@/lib/db/tools";
import { MemoryFlowDemo } from "@/components/plugin/MemoryFlowDemo";
import { EndpointCard } from "@/components/plugin/EndpointCard";
import { ConnectorGrid } from "@/components/plugin/ConnectorGrid";
import { ScopeMatrix } from "@/components/plugin/ScopeMatrix";

export const dynamic = "force-dynamic";

export default async function PluginPage() {
  const member = await getCurrentMember();
  const connection = await getOrCreatePrimaryConnection(member.id);
  const url = mcpEndpointUrl(connection.token);
  // Mask the token tail in the displayed URL; the full URL is copied.
  const masked = `${"•".repeat(8)}${connection.token.slice(-4)}`;
  const displayUrl = mcpEndpointUrl(masked) || `/api/mcp/${masked}`;

  return (
    <section className="screen on">
      <div className="eyebrow cool rise">Plug in</div>
      <h1 className="title rise">
        Your tools don&rsquo;t just read you.{" "}
        <em className="cool">They teach you back.</em>
      </h1>
      <div className="lede rise">
        Plug your clone into the tools where you actually work. They answer with
        your context, and every session writes new memories back, so the next
        one is sharper. That loop is the part nobody else has.
      </div>

      <MemoryFlowDemo />

      <div className="sect">
        Your clone as a connector (MCP)<span className="ln" />
      </div>
      <EndpointCard url={url} displayUrl={displayUrl} />

      <div className="sect">
        Plug into<span className="ln" />
      </div>
      <ConnectorGrid />

      <div className="sect">
        What each tool can see and write<span className="ln" />
      </div>
      <ScopeMatrix />
      <div className="consent rise">
        Sensitive categories stay locked until you turn them on per tool.
        Nothing in that row leaves your brain by default.
      </div>

      <div className="sect">
        What it feels like<span className="ln" />
      </div>
      <div className="usequote rise">
        <div className="ic">In Claude, with Soultech connected</div>
        <div className="uin">
          @soultech, what should I learn next to get my agent setup reliable?
        </div>
        <div className="uout">
          Pulling from your profile: you&rsquo;re at 62% on Claude orchestration
          and you learn by building.{" "}
          <b>
            Don&rsquo;t read about evals: scaffold a 3-agent pipeline, break it,
            and write one eval that catches the break.
          </b>{" "}
          Want me to draft the harness in your usual Cursor structure?
        </div>
      </div>
    </section>
  );
}
