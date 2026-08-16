import { prisma } from "@/lib/db";
import { headers } from "next/headers";

type AuditActorType = "EMPLOYEE" | "CHARITY_USER" | "SYSTEM";

/**
 * Best-effort audit trail write. Never throws — a logging failure must not
 * break the operation being observed. There is deliberately no update/delete
 * action anywhere in the app for AuditLog rows.
 */
export async function logAudit(entry: {
  actorType: AuditActorType;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorType: entry.actorType,
        actorId: entry.actorId ?? null,
        actorName: entry.actorName ?? null,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        metadata: entry.metadata as any,
        ipAddress: await getClientIp(),
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

export async function getClientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return h.get("x-real-ip");
  } catch {
    return null;
  }
}
