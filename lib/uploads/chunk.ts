const MIN_CHUNK_CHARS = 40;
const TARGET_CHUNK_CHARS = 1200;
const HARD_CAP_CHARS = 2400;

/**
 * Paragraph-first chunking for text and PDF-extracted content. We split on
 * double-newline boundaries, then re-merge short paragraphs to hit a target
 * chunk size that gives the embedding model enough context per memory.
 */
export function chunkText(input: string): string[] {
  const normalized = input.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n");
  const paragraphs = normalized
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= MIN_CHUNK_CHARS || /[.!?…]/.test(p));

  const chunks: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if (p.length > HARD_CAP_CHARS) {
      if (buf) {
        chunks.push(buf);
        buf = "";
      }
      chunks.push(...splitLongParagraph(p));
      continue;
    }
    if (!buf) {
      buf = p;
    } else if (buf.length + p.length + 2 <= TARGET_CHUNK_CHARS) {
      buf = `${buf}\n\n${p}`;
    } else {
      chunks.push(buf);
      buf = p;
    }
  }
  if (buf) chunks.push(buf);

  return chunks.filter((c) => c.trim().length >= MIN_CHUNK_CHARS);
}

function splitLongParagraph(paragraph: string): string[] {
  const sentences = paragraph.match(/[^.!?…]+[.!?…]+\s*|[^.!?…]+$/g) ?? [paragraph];
  const out: string[] = [];
  let buf = "";
  for (const s of sentences) {
    const piece = s.trim();
    if (!piece) continue;
    if (!buf) {
      buf = piece;
    } else if (buf.length + piece.length + 1 <= TARGET_CHUNK_CHARS) {
      buf = `${buf} ${piece}`;
    } else {
      out.push(buf);
      buf = piece;
    }
  }
  if (buf) out.push(buf);
  return out;
}
