CREATE TYPE "public"."connection_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."tool" AS ENUM('claude', 'cursor', 'chatgpt', 'notion', 'raycast', 'api');--> statement-breakpoint
CREATE TABLE "tool_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"tool" "tool" NOT NULL,
	"label" text,
	"token" text NOT NULL,
	"token_hash" text NOT NULL,
	"scope_matrix" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"can_write_back" boolean DEFAULT false NOT NULL,
	"status" "connection_status" DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "tool_connections_token_unique" UNIQUE("token"),
	CONSTRAINT "tool_connections_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "tool_connections" ADD CONSTRAINT "tool_connections_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tool_connections_member_idx" ON "tool_connections" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "tool_connections_token_hash_idx" ON "tool_connections" USING btree ("token_hash");