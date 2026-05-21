import { getDb } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

/**
 * Single entry point for audit log writes. Every server-side write that
 * touches a member's corpus should fire this. Keep the call site explicit:
 * do not auto-wrap mutations, because that obscures what was logged.
 */

export type AuditActor = "member" | "system";

export type AuditEntry = {
  memberId: string;
  actor: AuditActor;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
};

export async function logAudit(entry: AuditEntry): Promise<void> {
  await getDb().insert(auditLog).values({
    memberId: entry.memberId,
    actor: entry.actor,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    details: entry.details ?? {},
  });
}
