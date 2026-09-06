import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { DesignEventKind } from "@/lib/designEventLabels";

// Re-exported so server callers keep one import, while the client timeline
// takes them straight from designEventLabels and never touches this file.
export type { DesignEventKind } from "@/lib/designEventLabels";
export { DESIGN_EVENT_LABEL } from "@/lib/designEventLabels";

/**
 * The per-request history shown to staff AND to the charity that owns it.
 *
 * Deliberately not AuditLog: that table is a security record for
 * administrators, kept for a different reason and worded for a different
 * reader. This one answers "what has happened to my design", so it is written
 * in the language the charity already sees on the card.
 *
 * Every entry copies the actor's name rather than joining to it. Accounts get
 * renamed and deleted; a history that changes retroactively is not a history.
 */

export type DesignEventActor = {
  type: "EMPLOYEE" | "CHARITY_USER" | "SYSTEM";
  id?: string | null;
  name?: string | null;
};

export const SYSTEM_ACTOR: DesignEventActor = { type: "SYSTEM", name: "النظام" };

/**
 * Records one event.
 *
 * Never throws: a request that was successfully rescheduled must not be
 * reported as failed because its log line could not be written. A missing line
 * is a gap in the story; a rolled-back reschedule is a lie about the schedule.
 * Failures go to the server console instead.
 *
 * Pass `tx` to write inside a transaction that is already open — there the
 * caller owns the error handling, so it is allowed to fail with the rest.
 */
export async function logDesignEvent(
  args: {
    requestId: string;
    kind: DesignEventKind;
    actor: DesignEventActor;
    note?: string | null;
  },
  tx?: Prisma.TransactionClient
): Promise<void> {
  const data = {
    requestId: args.requestId,
    kind: args.kind,
    actorType: args.actor.type,
    actorId: args.actor.id ?? null,
    actorName: args.actor.name ?? null,
    note: args.note?.trim() || null,
  };

  if (tx) {
    await tx.designRequestEvent.create({ data });
    return;
  }

  try {
    await prisma.designRequestEvent.create({ data });
  } catch (err) {
    console.error("Failed to write design request event", args.kind, args.requestId, err);
  }
}

/** Same, for several requests at once — used when a queue is reordered. */
export async function logDesignEvents(
  entries: { requestId: string; kind: DesignEventKind; actor: DesignEventActor; note?: string | null }[],
  tx?: Prisma.TransactionClient
): Promise<void> {
  if (entries.length === 0) return;

  const data = entries.map((e) => ({
    requestId: e.requestId,
    kind: e.kind,
    actorType: e.actor.type,
    actorId: e.actor.id ?? null,
    actorName: e.actor.name ?? null,
    note: e.note?.trim() || null,
  }));

  if (tx) {
    await tx.designRequestEvent.createMany({ data });
    return;
  }

  try {
    await prisma.designRequestEvent.createMany({ data });
  } catch (err) {
    console.error("Failed to write design request events", err);
  }
}
