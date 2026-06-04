import { resolveConnection, touchConnection } from "@/lib/mcp/auth";
import { TOOLS, TOOLS_BY_NAME } from "@/lib/mcp/tools";
import { ScopeError } from "@/lib/mcp/scope";
import { logAudit } from "@/lib/audit";
import type { ToolConnection } from "@/lib/db/schema";

// The MCP server is request/response (stateless Streamable HTTP), which fits
// Vercel serverless. It authenticates by the per-connection token in the path,
// never a Clerk session (middleware exempts /api/mcp). Nodejs runtime: the
// tools touch the DB + Voyage.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROTOCOL_VERSION = "2024-11-05";

type RpcId = string | number | null;
type RpcMessage = {
  jsonrpc?: string;
  id?: RpcId;
  method?: string;
  params?: Record<string, unknown>;
};

function result(id: RpcId, value: unknown) {
  return { jsonrpc: "2.0", id, result: value };
}
function error(id: RpcId, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function handleMessage(
  msg: RpcMessage,
  connection: ToolConnection,
): Promise<object | null> {
  const id = msg.id ?? null;
  const method = msg.method;

  // Notifications (no id) get acknowledged with no body.
  if (msg.id === undefined || msg.id === null) return null;

  switch (method) {
    case "initialize":
      return result(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "Soultech", version: "1.0.0" },
      });
    case "ping":
      return result(id, {});
    case "tools/list":
      return result(id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      const args = (msg.params?.arguments as Record<string, unknown>) ?? {};
      const tool = TOOLS_BY_NAME.get(name);
      if (!tool) return error(id, -32601, `Unknown tool: ${name}`);
      try {
        const out = await tool.handler(
          { connection, memberId: connection.memberId },
          args,
        );
        await logAudit({
          memberId: connection.memberId,
          actor: "system",
          action: `mcp.${name}`,
          targetType: "tool_connection",
          targetId: connection.id,
          details: { tool: connection.tool },
        });
        const text =
          typeof out === "string" ? out : JSON.stringify(out, null, 2);
        return result(id, { content: [{ type: "text", text }] });
      } catch (e) {
        const denied = e instanceof ScopeError;
        await logAudit({
          memberId: connection.memberId,
          actor: "system",
          action: denied ? "mcp.denied" : "mcp.error",
          targetType: "tool_connection",
          targetId: connection.id,
          details: {
            tool: connection.tool,
            toolName: name,
            reason: e instanceof Error ? e.message : "error",
          },
        });
        const message = e instanceof Error ? e.message : "Tool failed";
        // Surface as an error tool-result so the model sees it (not a transport error).
        return result(id, { content: [{ type: "text", text: message }], isError: true });
      }
    }
    default:
      return error(id, -32601, `Method not found: ${method}`);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const connection = await resolveConnection(token);
  if (!connection) {
    return Response.json(error(null, -32001, "Invalid or revoked connection token"), {
      status: 401,
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(error(null, -32700, "Parse error"), { status: 400 });
  }

  void touchConnection(connection.id);

  if (Array.isArray(body)) {
    const out = (
      await Promise.all(body.map((m) => handleMessage(m as RpcMessage, connection)))
    ).filter((r): r is object => r !== null);
    return Response.json(out);
  }

  const res = await handleMessage(body as RpcMessage, connection);
  if (res === null) return new Response(null, { status: 202 });
  return Response.json(res);
}

export async function GET() {
  return new Response(
    "Soultech MCP endpoint. Connect with an MCP client over Streamable HTTP (POST JSON-RPC).",
    { status: 405, headers: { Allow: "POST" } },
  );
}
