import type { RequestAction } from "@prisma/client";

/**
 * Log actions that END a request at the person who took them: approved, sent
 * back, or refused. All three stop it where it is rather than moving it on.
 *
 * FORWARDED and DELEGATED are deliberately absent. Passing a request up the
 * chain is not deciding it — on the live data one reviewer had forwarded 53 of
 * 57 requests and decided none, and counting relays as decisions handed him
 * every request in the company.
 *
 * Lives here, in a plain module, because the same list is needed in three
 * places at once: the approvals page (a server component), getVisibleRequests
 * (a "use server" action, which may only export async functions), and the
 * client that renders the lane. Keeping three copies in step by hand is how one
 * of them silently falls behind.
 */
export const DECIDED_ACTIONS: RequestAction[] = ["APPROVED_FINAL", "RETURNED", "REJECTED"];

/** Same list as plain strings, for comparing against log rows on the client. */
export const DECIDED_ACTION_NAMES: string[] = DECIDED_ACTIONS;
