/**
 * A nudge from the mail screen to the sidebar badge.
 *
 * The badge lives in the dashboard layout, which is a client component that
 * persists across navigations — so it never re-renders when a message is read
 * and its count went stale until a full page reload. Rather than lifting mail
 * state into the layout, the mail screen simply says "something changed" and
 * the layout re-reads the count it already knows how to fetch.
 */

export const MAIL_UNREAD_EVENT = "zad-mail-unread-changed";

export function notifyMailUnreadChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MAIL_UNREAD_EVENT));
}
