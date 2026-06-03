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
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Soultech v1 corpus schema.
 *
 * The corpus is composed of `memories`, the smallest addressable unit, each
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

// Soultech v4 (learn-first): a learner's level on a skill track.
export const trackLevelEnum = pgEnum("track_level", [
  "beginner",
  "building",
  "fluent",
  "mastering",
]);

// active = shown on /learn; ghost = empty-state placeholder; archived = hidden.
export const trackStatusEnum = pgEnum("track_status", [
  "active",
  "ghost",
  "archived",
]);

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

/**
 * Soultech v4 learn-first additions.
 *
 * `learning_styles` holds one inferred row per member: the distilled "how you
 * learn" portrait rendered on /learn (amber card). `tracks` are the skills a
 * member is leveling up, each with a progress bar and a "next rep" suggestion
 * written in their learning style (cool-tinted). Both are populated by
 * inference + the MCP write-back loop in later phases; Phase 1 reads them and
 * falls back to empty states when absent.
 */
export const learningStyles = pgTable("learning_styles", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id")
    .notNull()
    .unique()
    .references(() => members.id, { onDelete: "cascade" }),
  // [{ key, label, value, evidence? }]
  traits: jsonb("traits").$type<LearningTrait[]>().default([]).notNull(),
  // memory ids / questionnaire ids the inference drew on
  inferredFrom: jsonb("inferred_from").$type<string[]>().default([]).notNull(),
  // prose for the amber "Your learning style, distilled" card
  summary: text("summary"),
  modelVersion: text("model_version"),
  generatedAt: timestamp("generated_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tracks = pgTable(
  "tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    level: trackLevelEnum("level").notNull().default("beginner"),
    // 0..1, drives the progress bar
    progress: real("progress").notNull().default(0),
    // "next rep" suggestion, written in the member's learning style
    nextRep: text("next_rep"),
    // short "62% · you've shipped working agents, next is reliability" caption
    progressNote: text("progress_note"),
    status: trackStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    memberIdx: index("tracks_member_idx").on(t.memberId),
    // advance_track(name, ...) resolves by (member, name), so it must be unique.
    memberNameUnique: uniqueIndex("tracks_member_name_unique").on(t.memberId, t.name),
  }),
);

export type LearningTrait = {
  key: string;
  label: string;
  value?: string;
  evidence?: string;
};

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
export type LearningStyle = typeof learningStyles.$inferSelect;
export type NewLearningStyle = typeof learningStyles.$inferInsert;
export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;
