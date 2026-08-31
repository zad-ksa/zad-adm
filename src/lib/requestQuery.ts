import type { Prisma } from "@prisma/client";
import { DECIDED_ACTIONS } from "./requestDecisions";

/**
 * The shape every approvals list is loaded with.
 *
 * Shared because the page renders one copy and the client's 15-second poll
 * fetches another through a server action. When these were two literals, any
 * edit to one silently changed what appeared after a refresh versus on first
 * load — the same drift that had already bitten the decision-action list.
 */
export const REQUEST_INCLUDE = {
  createdBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
  reviewedBy: { select: { id: true, name: true } },
  currentReviewer: { select: { id: true, name: true, role: true } },
  delegatedTo: { select: { id: true, name: true, role: true } },
  // Steps come with the chain now: the review modal names the person above
  // and below the current step, and cannot do that from an id alone. A chain
  // is a handful of rows, so this costs almost nothing.
  chain: {
    select: {
      id: true,
      name: true,
      steps: {
        select: { order: true, label: true, approver: { select: { id: true, name: true } } },
        orderBy: { order: "asc" as const },
      },
    },
  },
  logs: {
    include: {
      actor: { select: { id: true, name: true, role: true, avatarUrl: true } },
      delegatedTo: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.RequestInclude;

/**
 * Loads every relation in ONE query instead of one per relation.
 *
 * Prisma's default splits a findMany+include into a separate round trip per
 * relation — nine of them for the shape above. The SQL itself is trivial
 * (0.17ms measured), but the database sits in ap-southeast-2 and every round
 * trip pays that distance, so the count is what costs, not the work.
 *
 * Measured on this page: 1564ms median before, 319ms after.
 *
 * Kept as a shared const so both callers get it and neither can drift.
 */
export const RELATION_JOIN = { relationLoadStrategy: "join" } as const;

/**
 * What one employee may see: what they raised, what is sitting with them, and
 * what they personally decided.
 *
 * `currentReviewerId` and `delegatedToId` are matched only against the status
 * that makes them meaningful. That was defensive when written — the column kept
 * pointing at the last reviewer after approval — and stays as a guard for rows
 * created before that was fixed.
 *
 * `canManage` adds nothing but the chainless-request fallback: a request with no
 * workflow has no named approver, and without this it could never be actioned.
 */
export function visibleRequestFilter(
  employeeId: string,
  canManage: boolean
): Prisma.RequestWhereInput {
  return {
    OR: [
      { createdById: employeeId },
      { status: "PENDING", currentReviewerId: employeeId },
      { status: "DELEGATED", delegatedToId: employeeId },
      { logs: { some: { actorId: employeeId, action: { in: DECIDED_ACTIONS } } } },
      ...(canManage ? [{ status: "PENDING" as const, currentReviewerId: null }] : []),
    ],
  };
}

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

/** Pending first, then by priority, then oldest first. Everything else newest first. */
export function sortRequests<T extends { status: string; priority: string; createdAt: Date | string }>(
  requests: T[]
): T[] {
  return requests.sort((a, b) => {
    if (a.status === "PENDING" && b.status !== "PENDING") return -1;
    if (b.status === "PENDING" && a.status !== "PENDING") return 1;
    if (a.status === "PENDING" && b.status === "PENDING") {
      const pa = PRIORITY_ORDER[a.priority] ?? 3;
      const pb = PRIORITY_ORDER[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
