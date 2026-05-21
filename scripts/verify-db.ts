/**
 * Smoke test: hits the live DB, lists tables and confirms pgvector is loaded.
 * Run with: node --env-file=.env.local --experimental-strip-types scripts/verify-db.ts
 */

import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);

  const tables = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `;
  console.log("Tables:", tables.map((r) => r.table_name).join(", "));

  const extensions = await sql`
    select extname from pg_extension where extname = 'vector'
  `;
  console.log("pgvector:", extensions.length > 0 ? "installed" : "MISSING");

  const indexes = await sql`
    select indexname from pg_indexes
    where schemaname = 'public' and indexname = 'memories_embedding_idx'
  `;
  console.log("HNSW index on memories.embedding:", indexes.length > 0 ? "present" : "MISSING");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
