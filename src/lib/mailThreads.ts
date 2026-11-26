/**
 * جمعُ البريد في سلاسل: صفٌّ واحدٌ للمحادثة في القائمة، لا صفٌّ لكلِّ رسالة.
 *
 * وكانت القائمةُ تعرض صفّاً لكلِّ رسالة، فالردُّ يصل في «صندوقٍ» مستقلٍّ عن
 * رسالته الأولى — وهما محادثةٌ واحدة. وصفحةُ الرسالة تعرض السلسلةَ كاملةً
 * مطويّةً منذ البداية (`getMailById` يحمِّل الجذر)، فكان النقصُ في القائمة
 * وحدَها.
 *
 * وكلُّ ردٍّ معلَّقٌ بجذر السلسلة لا بالرسالة التي رُدَّ عليها (انظر `sendMail`)،
 * فالجذرُ هو `parentId` إن وُجد وإلّا فالرسالةُ نفسُها — بلا تتبُّعٍ صاعدٍ ولا
 * استعلامٍ متكرِّر.
 *
 * وهذا الملفُّ خالصٌ لا يعرف Prisma: يأخذ صفوفاً مُسطَّحةً ويردُّ سلاسلَ
 * مرتَّبة، فيُختبَر بلا قاعدة بيانات ويخدم صندوقَ زاد وصندوقَ البوّابة معاً.
 */

/** صفٌّ واحدٌ كما يراه صاحب الصندوق: رسالةٌ، وحالُها عنده. */
export type ThreadSeed = {
  /**
   * معرّفُ الصفِّ في القائمة — صفُّ `MailRecipient` في الوارد، ومعرّفُ الرسالة
   * نفسِها في المُرسَل. وهو ما يُحدَّد به الصفُّ في الواجهة.
   */
  rowId: string;
  mailId: string;
  /** جذرُ السلسلة. */
  threadId: string;
  createdAt: Date | string | number;
  isRead: boolean;
  isStarred: boolean;
};

/** سلسلةٌ مجموعة — ما يُعرض في سطرٍ واحد. */
export type MailThread = {
  threadId: string;
  /** الأحدثُ في السلسلة: هو ما يُقرأ في السطر، كجيميل. */
  latestRowId: string;
  latestMailId: string;
  /** كلُّ صفوف السلسلة في هذا الصندوق — منها تعمل الأفعالُ الجماعيّة. */
  rowIds: string[];
  /** كلُّ رسائل السلسلة في هذا الصندوق، من الأقدم إلى الأحدث. */
  mailIds: string[];
  count: number;
  /** غيرُ مقروءةٍ إن كانت فيها رسالةٌ واحدةٌ لم تُقرأ. */
  isUnread: boolean;
  /** مميَّزةٌ إن كانت فيها رسالةٌ مميَّزة. */
  isStarred: boolean;
  /** وقتُ آخر رسالةٍ فيها — عليه يقوم الترتيب. */
  lastAt: number;
};

/** وقتُ الصفِّ عدداً، أيّاً كان شكلُه القادم من القاعدة. */
function timeOf(value: Date | string | number): number {
  if (typeof value === "number") return value;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/** جذرُ السلسلة من صفِّ رسالة. */
export function threadIdOf(mail: { id: string; parentId?: string | null }): string {
  return mail.parentId ?? mail.id;
}

/**
 * يجمع الصفوفَ في سلاسل، ويرتِّبها بالأحدث نشاطاً.
 *
 * ولا يعتمد على ترتيب ما يدخله: الأحدثُ يُحسب بالمقارنة لا بأوّل ما وصل، فإن
 * جاء الصفُّ مرتَّباً تصاعديّاً أو تنازليّاً كان الجوابُ واحداً. وعند تساوي
 * الوقت يُرجَّح المعرّفُ ترتيباً ثابتاً، فلا يختلف الترتيبُ من طلبٍ إلى آخر.
 */
export function groupMailThreads(seeds: ThreadSeed[]): MailThread[] {
  const byThread = new Map<string, { thread: MailThread; rows: { rowId: string; mailId: string; at: number }[] }>();

  for (const seed of seeds) {
    const at = timeOf(seed.createdAt);
    const found = byThread.get(seed.threadId);

    if (!found) {
      byThread.set(seed.threadId, {
        thread: {
          threadId: seed.threadId,
          latestRowId: seed.rowId,
          latestMailId: seed.mailId,
          rowIds: [],
          mailIds: [],
          count: 0,
          isUnread: !seed.isRead,
          isStarred: seed.isStarred,
          lastAt: at,
        },
        rows: [{ rowId: seed.rowId, mailId: seed.mailId, at }],
      });
      continue;
    }

    found.rows.push({ rowId: seed.rowId, mailId: seed.mailId, at });
    if (!seed.isRead) found.thread.isUnread = true;
    if (seed.isStarred) found.thread.isStarred = true;
    if (at > found.thread.lastAt) {
      found.thread.lastAt = at;
      found.thread.latestRowId = seed.rowId;
      found.thread.latestMailId = seed.mailId;
    }
  }

  const threads: MailThread[] = [];
  for (const { thread, rows } of byThread.values()) {
    rows.sort((a, b) => a.at - b.at || a.mailId.localeCompare(b.mailId));
    thread.rowIds = rows.map((r) => r.rowId);
    thread.mailIds = rows.map((r) => r.mailId);
    thread.count = rows.length;
    threads.push(thread);
  }

  threads.sort((a, b) => b.lastAt - a.lastAt || a.threadId.localeCompare(b.threadId));
  return threads;
}

/** صفحةٌ من قائمةٍ محسوبةٍ في الذاكرة — الترقيمُ على السلاسل لا على الرسائل. */
export function threadPage<T>(threads: T[], page: number, limit: number): T[] {
  const size = Math.max(1, Math.floor(limit));
  const index = Math.max(1, Math.floor(page)) - 1;
  const start = index * size;
  return threads.slice(start, start + size);
}
