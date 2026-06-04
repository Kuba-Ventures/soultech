CREATE TYPE "public"."track_level" AS ENUM('beginner', 'building', 'fluent', 'mastering');--> statement-breakpoint
CREATE TYPE "public"."track_status" AS ENUM('active', 'ghost', 'archived');--> statement-breakpoint
CREATE TABLE "learning_styles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"traits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"inferred_from" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text,
	"model_version" text,
	"generated_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_styles_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"name" text NOT NULL,
	"level" "track_level" DEFAULT 'beginner' NOT NULL,
	"progress" real DEFAULT 0 NOT NULL,
	"next_rep" text,
	"progress_note" text,
	"status" "track_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_styles" ADD CONSTRAINT "learning_styles_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tracks_member_idx" ON "tracks" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_member_name_unique" ON "tracks" USING btree ("member_id","name");