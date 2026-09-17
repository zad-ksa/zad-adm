export type MailListItem = {
  rowId: string;
  mailId: string;
  subject: string;
  snippet: string;
  displayName: string;
  /**
   * النص الكامل غير المختصر لأسماء المستلمين، يُعرض في tooltip عند المرور
   * بالفأرة. يختلف عن displayName فقط في تبويب "المرسل" حين يكون هناك أكثر
   * من مستلمَين — عندها displayName يلخّص القائمة إلى "فلان وN آخرين" بدل
   * سرد كل الأسماء التي كانت تُقصّ بشكل غير مفهوم في العمود الضيق.
   */
  displayNameTitle?: string;
  /**
   * مَن كانت الرسالة موجّهة إليه ظاهرياً (TO) — يظهر بجانب اسم المرسل في الوارد
   * والمميّزة وسلة المهملات فقط. غائب في المرسل/المسودات لأن اسم المستلم هناك هو
   * displayName نفسه أصلاً.
   *
   * الغرض: مستلم بالنسخة المخفية (BCC) يرى في صندوق وارده "من فلان — إلى علّان"،
   * لا "من فلان" وحدها التي توحي بأن الرسالة موجَّهة إليه هو تحديداً بينما هي في
   * الحقيقة موجَّهة لشخص آخر ونُسخت إليه خفيةً. القيمة مبنية على `recipients` بعد
   * أن غربلته stripHiddenBcc في مصدر البيانات، فلا تحمل أسماء نسخة مخفية أخرى.
   */
  toLabel: string | null;
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
  let displayNameTitle: string | undefined;
  let avatarUrl: string | null = null;
  let toLabel: string | null = null;

  if (tab === "sent" && mail.charity) {
    // بريدٌ إلى جمعية يُعرَّف بجمعيته وخدمته لا بأسماء من وصلهم: هكذا أُرسل باسم
    // الخدمة، وهكذا يقرؤه الطرف الآخر. وأسماء المفوَّضين تبقى في التلميح لمن أراد.
    displayName = mail.charity.name;
    const members = (mail.recipients || []).map((r: any) => r.charityUser?.name).filter(Boolean);
    displayNameTitle = [mail.serviceName ? `زاد | ${mail.serviceName}` : null, members.join("، ")]
      .filter(Boolean)
      .join(" — ");
  } else if (tab === "sent") {
    const recipients = mail.recipients || [];
    const names = recipients.map((r: any) => r.employee?.name).filter(Boolean);
    if (names.length === 1) {
      displayName = names[0];
    } else if (names.length === 2) {
      displayName = `${names[0]} و${names[1]}`;
    } else if (names.length > 2) {
      displayName = `${names[0]} و${names.length - 1} آخرين`;
      displayNameTitle = names.join("، ");
    }
    avatarUrl = recipients[0]?.employee?.avatarUrl || null;
  } else if (tab === "drafts") {
    const charityCount = (mail.draftCharityIds || []).length;
    if (charityCount > 0) {
      // أسماء الجمعيات ليست في صفّ المسودة، وجلبها لسطرٍ في قائمة لا يستحق
      // استعلاماً — العدد والخدمة يكفيان لتمييز المسودة حتى تُفتح.
      const label = charityCount === 1 ? "جمعية واحدة" : `${charityCount} جمعيات`;
      displayName = mail.serviceName ? `${label} — ${mail.serviceName}` : label;
    } else {
      const names = (mail.draftToIds || []).map((id: string) => employeesById?.[id]?.name).filter(Boolean);
      displayName = names.length > 0 ? names.join("، ") : "بدون مستلمين";
    }
  } else {
    // مرسِلٌ من جمعية: الاسم وحده لا يكفي، فيسبقه اسم جمعيته ليُعرف من أين جاء.
    displayName = mail.senderCharityUser
      ? mail.charity
        ? `${mail.charity.name} | ${mail.senderCharityUser.name}`
        : mail.senderCharityUser.name
      : mail.sender?.name || "غير معروف";
    avatarUrl = mail.sender?.avatarUrl || null;

    const toNames = (mail.recipients || [])
      .filter((r: any) => r.type === "TO")
      .map((r: any) => r.employee?.name)
      .filter(Boolean);
    toLabel = toNames.length > 0 ? toNames.join("، ") : null;
  }

  return {
    rowId: item.id,
    mailId: mail.id,
    subject: mail.subject || "(بدون موضوع)",
    snippet: htmlToPlainText(mail.body || ""),
    displayName,
    displayNameTitle,
    toLabel,
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
