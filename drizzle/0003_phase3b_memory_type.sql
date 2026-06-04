CREATE TYPE "public"."memory_type" AS ENUM('FACT', 'PLAN', 'MEMORY', 'PREFERENCE');--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "type" "memory_type" DEFAULT 'MEMORY' NOT NULL;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "type_confidence" real;--> statement-breakpoint
ALTER TABLE "memories" ADD COLUMN "type_source" text;--> statement-breakpoint
CREATE INDEX "memories_member_type_idx" ON "memories" USING btree ("member_id","type");