import {
  pgTable,
  pgEnum,
  text,
  uuid,
  timestamp,
  jsonb,
  boolean,
  vector,
  integer,
  index,
} from "drizzle-orm/pg-core";

/**
 * Soultech v1 corpus schema.
 *
 * The corpus is composed of `memories` — the smallest addressable unit, each
 * representing one conversation segment, document chunk, or transcribed audio
 * window. Raw inputs are preserved in `sources`; everything member-facing flows
 * through `conversations` / `messages`. `audit_log` records every write.
 */

export const sourceTypeEnum = pgEnum("source_type", [
  "chat",
  "upload_doc",
  "upload_audio",
  "voice_memo",
]);

export const sourceStatusEnum = pgEnum("source_status", [
  "processing",
  "ready",
  "failed",
]);

export const messageRoleEnum = pgEnum("message_role", ["member", "clone"]);

export const auditActorEnum = pgEnum("audit_actor", ["member", "system"]);

export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}).notNull(),
});

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    sourceType: sourceTypeEnum("source_type").notNull(),
    originalFilename: text("original_filename"),
    storageKey: text("storage_key"),
    status: sourceStatusEnum("status").notNull().default("processing"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => ({
    memberIdx: index("sources_member_idx").on(t.memberId),
  }),
);

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    sourceType: sourceTypeEnum("source_type").notNull(),
    sourceId: uuid("source_id").references(() => sources.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    contentSummary: text("content_summary").notNull(),
    embedding: vector("embedding", { dimensions: 1024 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    redacted: boolean("redacted").default(false).notNull(),
    redactionReason: text("redaction_reason"),
  },
  (t) => ({
    memberIdx: index("memories_member_idx").on(t.memberId),
    sourceIdx: index("memories_source_idx").on(t.sourceId),
    // HNSW index for cosine distance, the default we'll use for retrieval.
    embeddingIdx: index("memories_embedding_idx")
      .using("hnsw", t.embedding.op("vector_cosine_ops")),
  }),
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    memberIdx: index("conversations_member_idx").on(t.memberId),
  }),
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    citations: jsonb("citations").$type<string[]>().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    conversationIdx: index("messages_conversation_idx").on(t.conversationId),
  }),
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    actor: auditActorEnum("actor").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    details: jsonb("details").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    memberIdx: index("audit_log_member_idx").on(t.memberId),
    createdIdx: index("audit_log_created_idx").on(t.createdAt),
  }),
);

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
