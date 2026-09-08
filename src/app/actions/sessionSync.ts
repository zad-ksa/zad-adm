"use server";

import { getSession } from "@/lib/auth";

/**
 * The signed-in employee's CURRENT role and permissions.
 *
 * Exists because of where the sidebar gets its copy. The dashboard layout is a
 * server component that resolves the session and hands it to the client tree —
 * but a layout does not re-render on client navigation, so that copy is frozen
 * at the last full page load. Granting somebody a permission changed nothing on
 * their screen until they reloaded, which read as "you have to log out and back
 * in".
 *
 * The server was never stale: getSession() re-reads the Employee row on every
 * request, so every guard and every action already used the live list. What was
 * stale was the menu — a display problem, not an authorization hole. Someone
 * whose access had been revoked could still SEE the item; clicking it was
 * refused all the same.
 *
 * Returns null when there is no session, which the caller treats as "leave what
 * you have" rather than "you now have nothing".
 */
export async function getCurrentPermissions(): Promise<{
  role: string;
  permissions: string[];
} | null> {
  const session = await getSession();
  if (!session?.id) return null;
  return {
    role: session.role ?? "",
    permissions: session.permissions ?? [],
  };
}
