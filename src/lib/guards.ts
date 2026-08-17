import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db";

// Shared authorization guards for API routes and server actions.
//
// Why this exists: every exported function in a "use server" file is a real
// HTTP entry point, and every file under app/api is reachable directly — the
// route protection in src/proxy.ts only covers page navigations (/main, /portal)
// and does not run for these. Each entry point must therefore guard itself.
//
// The throwing style matches the guards already used across the codebase
// (requireSession in approvals.ts, requireAdmin in workflow.ts,
// getAuthenticatedUser in tasks.ts), which this module consolidates.

export const UNAUTHORIZED_MESSAGE = "غير مصرح";

export class AuthError extends Error {
  status: number;
  constructor(message: string = UNAUTHORIZED_MESSAGE, status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/** Any authenticated user (employee or charity account). */
export async function requireSession() {
  const session = await getSession();
  if (!session?.id) throw new AuthError(UNAUTHORIZED_MESSAGE, 401);
  return session;
}

/** An employee — excludes charity portal accounts. */
export async function requireEmployee() {
  const session = await requireSession();
  if (session.userType === "CHARITY_USER") {
    throw new AuthError(UNAUTHORIZED_MESSAGE, 403);
  }
  return session;
}

/**
 * An employee holding a specific permission. This is the primary gate.
 * Resolution goes through hasPermission() so that developer_mode and the
 * RoleDefinition-driven permissions arrays keep working — never hardcode a
 * role list at a call site.
 */
export async function requirePermission(permission: string) {
  const session = await requireEmployee();
  if (!hasPermission(session.role, session.permissions || [], permission)) {
    throw new AuthError(UNAUTHORIZED_MESSAGE, 403);
  }
  return session;
}

/**
 * An employee holding at least one of several permissions. Used where the same
 * action is legitimately reachable from two screens gated differently — e.g.
 * toggleInstallmentPaid is called from both the contracts screen
 * (edit_contracts) and the charity finance screen (manage_finance); requiring
 * only one of them would lock out the other screen's users.
 */
export async function requireAnyPermission(permissions: string[]) {
  const session = await requireEmployee();
  const granted = permissions.some((p) =>
    hasPermission(session.role, session.permissions || [], p)
  );
  if (!granted) throw new AuthError(UNAUTHORIZED_MESSAGE, 403);
  return session;
}

/**
 * A charity portal account that actually belongs to the given charity.
 *
 * Membership is checked against the CharityUserCharity link table rather than
 * session.charityId, because an account may be linked to several charities and
 * switch between them (see selectCharitySession in actions/authCharity.ts) —
 * comparing session.charityId alone would lock those users out of their own
 * other charities.
 */
export async function requireCharityMembership(charityId: string) {
  const session = await requireSession();
  if (session.userType !== "CHARITY_USER") {
    throw new AuthError(UNAUTHORIZED_MESSAGE, 403);
  }

  const link = await prisma.charityUserCharity.findUnique({
    where: {
      charityUserId_charityId: {
        charityUserId: session.id,
        charityId,
      },
    },
    select: { charityId: true },
  });

  if (!link) throw new AuthError(UNAUTHORIZED_MESSAGE, 403);
  return session;
}

/** Converts a guard failure into a JSON response for API route handlers. */
export function authErrorResponse(error: unknown) {
  const status = error instanceof AuthError ? error.status : 401;
  return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status });
}
