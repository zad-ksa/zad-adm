export type MailListItem = {
  rowId: string;
  mailId: string;
  subject: string;
  snippet: string;
  displayName: string;
  avatarUrl: string | null;
  isUnread: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  createdAt: Date | string;
};

/**
 * `getInbox`/`getStarredMails`/`getTrashMails` return `MailRecipient` rows (with a
 * nested `.mail`), `getSentMails` returns `InternalMail` rows directly, and
 * `getDrafts` returns `InternalMail` rows with no `sender`/`recipients` populated
 * (recipients aren't real `MailRecipient` rows yet — see `draftToIds` etc).
 * This normalizes all three shapes into one row model so `MailRow` never has to branch.
 */
export function normalizeMailListItem(
  item: any,
  tab: string,
  employeesById?: Record<string, { name: string; avatarUrl?: string | null }>
): MailListItem {
  const mail = item.mail || item;

  let displayName = "غير معروف";
  let avatarUrl: string | null = null;

  if (tab === "sent") {
    const recipients = mail.recipients || [];
    if (recipients.length > 0) {
      displayName = recipients.map((r: any) => r.employee?.name).filter(Boolean).join("، ");
      avatarUrl = recipients[0].employee?.avatarUrl || null;
    }
  } else if (tab === "drafts") {
    const names = (mail.draftToIds || []).map((id: string) => employeesById?.[id]?.name).filter(Boolean);
    displayName = names.length > 0 ? names.join("، ") : "بدون مستلمين";
  } else {
    displayName = mail.sender?.name || "غير معروف";
    avatarUrl = mail.sender?.avatarUrl || null;
  }

  return {
    rowId: item.id,
    mailId: mail.id,
    subject: mail.subject || "(بدون موضوع)",
    snippet: htmlToPlainText(mail.body || ""),
    displayName,
    avatarUrl,
    isUnread: tab !== "sent" && tab !== "drafts" && item.isRead === false,
    isStarred: !!item.isStarred,
    hasAttachments: !!(mail.attachments && mail.attachments.length > 0),
    createdAt: tab === "drafts" ? mail.updatedAt || mail.createdAt : mail.createdAt,
  };
}

const HTML_ENTITY_MAP: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]*>?/gm, " ")
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (m) => HTML_ENTITY_MAP[m] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

export function isHtmlBody(body: string): boolean {
  return /<[a-z][\s\S]*>/i.test(body);
}

/**
 * Gmail-style relative date formatting for the mail list.
 */
export function formatMailDate(d: Date | string): string {
  const date = new Date(d);
  const now = new Date();

  const isSameDay = date.toDateString() === now.toDateString();
  if (isSameDay) {
    return new Intl.DateTimeFormat("ar-SA", { hour: "2-digit", minute: "2-digit" }).format(date);
  }

  const isSameYear = date.getFullYear() === now.getFullYear();
  if (isSameYear) {
    return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short" }).format(date);
  }

  return new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "numeric", day: "numeric" }).format(date);
}

/**
 * Splits a mail body around the quoted-reply marker so the UI can offer a
 * "show quoted text" toggle instead of always rendering the full history.
 */
export function splitQuotedHtml(html: string): [main: string, quoted: string | null] {
  const marker = '<div class="mail-quote">';
  const idx = html.indexOf(marker);
  if (idx === -1) return [html, null];
  return [html.slice(0, idx), html.slice(idx)];
}
