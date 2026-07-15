import { AppError } from "@/lib/errors";

/**
 * Minimal Notion REST client for the "connect your Notion" source. The member
 * creates an internal integration in Notion, shares a few pages with it, and
 * pastes the integration token here. We validate the token, then pull the text
 * of the shared pages so parse.ts can read it into the profile.
 *
 * We only ever read. No writes, and the token stays server-side (see crypto.ts).
 */

const API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

// Bounds so one pull can't fan out unboundedly or blow up the parse input.
const MAX_PAGES = 25;
const MAX_BLOCKS_PER_PAGE = 100;
const MAX_CHARS = 100_000;

// Block types whose rich_text we treat as profile-relevant prose.
const TEXT_BLOCKS = new Set([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "quote",
  "callout",
  "to_do",
  "toggle",
]);

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

/** Validate a token by calling the bot-user endpoint. Returns the workspace/bot name. */
export async function validateNotionToken(
  token: string,
): Promise<{ ok: true; name: string } | { ok: false }> {
  try {
    const res = await fetch(`${API}/users/me`, { headers: headers(token) });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as {
      name?: string;
      bot?: { workspace_name?: string };
    };
    return { ok: true, name: data.bot?.workspace_name || data.name || "Notion" };
  } catch {
    return { ok: false };
  }
}

type RichText = { plain_text?: string };
type Block = Record<string, unknown> & { type?: string };

function textFromBlock(block: Block): string {
  const type = block.type;
  if (!type || !TEXT_BLOCKS.has(type)) return "";
  const inner = block[type] as { rich_text?: RichText[] } | undefined;
  const rich = inner?.rich_text;
  if (!Array.isArray(rich)) return "";
  return rich.map((r) => r.plain_text ?? "").join("");
}

/**
 * Pull the text of pages shared with the integration. Returns a single plain
 * string (page titles + first-level block text), capped at MAX_CHARS. Throws
 * an AppError if the token is rejected mid-pull.
 */
export async function pullNotionText(token: string): Promise<string> {
  const searchRes = await fetch(`${API}/search`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      filter: { property: "object", value: "page" },
      page_size: MAX_PAGES,
    }),
  });
  if (!searchRes.ok) {
    throw new AppError("model_failed", "Couldn't read from Notion. Reconnect and try again.", {
      internal: `notion search ${searchRes.status}`,
    });
  }
  const search = (await searchRes.json()) as {
    results?: Array<{ id: string; properties?: Record<string, unknown> }>;
  };
  const pages = search.results ?? [];

  const parts: string[] = [];
  let total = 0;

  for (const page of pages) {
    if (total >= MAX_CHARS) break;

    // Page title lives in whichever property has type "title".
    const title = pageTitle(page.properties);
    if (title) {
      parts.push(`# ${title}`);
      total += title.length + 2;
    }

    const blocksRes = await fetch(
      `${API}/blocks/${page.id}/children?page_size=${MAX_BLOCKS_PER_PAGE}`,
      { headers: headers(token) },
    );
    if (!blocksRes.ok) continue; // skip a page we can't read rather than fail the whole pull
    const blocks = (await blocksRes.json()) as { results?: Block[] };
    for (const block of blocks.results ?? []) {
      const text = textFromBlock(block).trim();
      if (!text) continue;
      parts.push(text);
      total += text.length + 1;
      if (total >= MAX_CHARS) break;
    }
  }

  return parts.join("\n").slice(0, MAX_CHARS);
}

function pageTitle(properties: Record<string, unknown> | undefined): string {
  if (!properties) return "";
  for (const value of Object.values(properties)) {
    const v = value as { type?: string; title?: RichText[] };
    if (v?.type === "title" && Array.isArray(v.title)) {
      return v.title.map((r) => r.plain_text ?? "").join("").trim();
    }
  }
  return "";
}
