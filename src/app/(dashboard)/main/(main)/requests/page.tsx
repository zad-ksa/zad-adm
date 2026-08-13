import { redirect } from "next/navigation";

// This route was renamed to /main/approvals. Old bookmarks and links already
// persisted in AppNotification.link rows still point here — keep this thin
// redirect so they don't 404.
export default function LegacyRequestsRedirect() {
  redirect("/main/approvals");
}
