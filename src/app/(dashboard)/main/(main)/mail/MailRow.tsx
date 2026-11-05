"use client";

import Link from "next/link";
import { Paperclip, Star } from "lucide-react";
import { Avatar, CheckMark, MONO, cx, listRow } from "@/components/console/ui";
import type { MailListItem } from "./mailUtils";
import { formatMailDate } from "./mailUtils";

interface MailRowProps {
  item: MailListItem;
  isSelected: boolean;
  showStar: boolean;
  /** `shiftKey` يُمرَّر كما هو: المدى يُحسب عند المُنادي حيث القائمةُ معلومة. */
  onToggleSelect: (rowId: string, shiftKey: boolean) => void;
  onToggleStar: (mailId: string) => void;
  onOpen: (mailId: string, isUnread: boolean) => void;
  /** Drafts aren't real single-mail pages yet — clicking one reopens the compose modal instead of navigating. */
  asButton?: boolean;
}

/** حلقةُ تركيزٍ داخليّةٌ: الصفُّ ممتدٌّ بعرض القائمة، فحلقةٌ خارجيّةٌ تُقصّ. */
const focusRow = "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40";

/**
 * صفُّ رسالةٍ في القائمة — بعدّة اللوحة لا بتصميمٍ خاصٍّ بالبريد.
 *
 * وكان له ظلالٌ ثلاثةٌ وإطارٌ ذهبيٌّ وسُلّمُ خطٍّ مستقلٌّ (`--mail-fs-*`) لا
 * نظيرَ لها في الموقع، فصار صفُّ الرسالةِ لا يُشبه صفّاً آخرَ فيه. والحالاتُ
 * الآن من `listRow`، والمقاساتُ من سُلّم الخطّ المُعلَن، والصورةُ من `Avatar`،
 * ومربّعُ الاختيار من `CheckMark`.
 *
 * **وشكلان لمكوّنٍ واحد**: سطرٌ كثيفٌ واحدٌ على سطح المكتب، وكومةٌ على الهاتف —
 * فخمسةُ أعمدةٍ في ٣٦٠ بكسل تُعطي كلَّ عمودٍ كلمتين ثم تقصّ، فلا يقول الصفُّ
 * شيئاً.
 */
export default function MailRow({
  item,
  isSelected,
  showStar,
  onToggleSelect,
  onToggleStar,
  onOpen,
  asButton = false,
}: MailRowProps) {
  const { isUnread } = item;

  const rowClassName = cx(
    listRow({ selected: isSelected, unread: isUnread }),
    "min-h-10 sm:grid sm:grid-cols-[1.75rem_1.75rem_minmax(6rem,8.5rem)_minmax(0,1fr)_auto] sm:py-1.5",
    focusRow
  );

  const checkbox = (
    <span
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`تحديد رسالة ${item.subject}`}
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleSelect(item.rowId, e.shiftKey);
      }}
      onKeyDown={(e) => {
        if (e.key !== " " && e.key !== "Enter") return;
        e.preventDefault();
        e.stopPropagation();
        onToggleSelect(item.rowId, e.shiftKey);
      }}
      className="hidden size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 sm:flex dark:text-slate-500 dark:hover:bg-slate-800"
    >
      <CheckMark state={isSelected ? "on" : "off"} />
    </span>
  );

  const star = showStar ? (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleStar(item.mailId);
      }}
      className="hidden size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-slate-100 sm:flex dark:hover:bg-slate-800"
      title={item.isStarred ? "إزالة النجمة" : "تمييز بنجمة"}
      aria-label={item.isStarred ? "إزالة النجمة" : "تمييز بنجمة"}
    >
      <Star
        className={cx(
          "size-4 transition-colors",
          item.isStarred
            ? "fill-secondary text-secondary dark:fill-amber-400 dark:text-amber-400"
            : "text-slate-300 hover:text-secondary/70 dark:text-slate-600 dark:hover:text-amber-400/70"
        )}
      />
    </button>
  ) : (
    <span className="hidden sm:block" />
  );

  // المرسِلُ كالعنوان: عريضٌ في غير المقروءة، عاديٌّ في المقروءة. فثِقَلُ
  // الخطِّ كلُّه في الصفّ يقول شيئاً واحداً — «هذه لم تُقرأ» — فإن بقي أحدُهما
  // ثقيلاً بدا الصفُّ نصفَ مقروء.
  const senderName = (
    <span
      className={cx(
        "truncate text-body",
        isUnread ? "font-bold text-slate-900 dark:text-white" : "font-normal text-slate-700 dark:text-slate-300"
      )}
      title={item.displayNameTitle}
    >
      {item.displayName}
    </span>
  );

  const date = (
    <span
      className={cx(
        MONO,
        "whitespace-nowrap text-caption",
        isUnread ? "font-semibold text-primary dark:text-teal-300" : "text-slate-400 dark:text-slate-500"
      )}
    >
      {formatMailDate(item.createdAt)}
    </span>
  );

  // عنوانُ غيرِ المقروءة عريضٌ (bold)، والمقروءةُ بوزنٍ عاديّ — لا متوسّطٍ:
  // المتوسّطُ قريبٌ من العريض فلا يُفرَّق بينهما في سطرٍ واحد.
  const subject = (
    <span
      className={cx(
        "text-body",
        isUnread ? "font-bold text-slate-900 dark:text-white" : "font-normal text-slate-700 dark:text-slate-300"
      )}
    >
      {item.subject}
    </span>
  );

  /** نقطةُ «غيرُ مقروء» — حالةٌ تستحقّ لونَ الهوية. */
  const unreadDot = isUnread ? (
    <span aria-label="غير مقروءة" className="size-1.5 shrink-0 rounded-full bg-primary dark:bg-teal-400" />
  ) : null;

  const content = (
    <>
      {checkbox}
      {star}

      {/* الهاتف: كومةٌ واحدة. الصورةُ تُثبِّت سطرَ المرسِل، والتاريخُ مقابلَه
          حيث تنظر العينُ إليه أصلاً. */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={item.displayName} src={item.avatarUrl} size="sm" />
          <span className="min-w-0 flex-1 truncate">{senderName}</span>
          {item.hasAttachments && <Paperclip className="size-3.5 shrink-0 text-slate-400" />}
          {unreadDot}
          {date}
        </div>
        {item.toLabel && (
          <span className="truncate text-caption text-slate-400 dark:text-slate-500" title={`إلى: ${item.toLabel}`}>
            إلى: {item.toLabel}
          </span>
        )}
        <span className="truncate">{subject}</span>
        <span className="truncate text-meta text-slate-400 dark:text-slate-500">{item.snippet}</span>
      </div>

      {/* سطحُ المكتب: السطرُ الكثيفُ الواحد — ومعه سطرٌ أصغرُ يُسمّي المستلمَ
          الظاهر (TO) حين لا يكون «أنت»، فمن وصلته نسخةٌ مخفيّةٌ يرى «من س —
          إلى ص» لا مرسِلاً مجرّداً يُقرأ كأنّ الرسالةَ إليه. */}
      <div className="hidden min-w-0 flex-col justify-center gap-0.5 sm:flex">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={item.displayName} src={item.avatarUrl} size="sm" />
          {senderName}
        </div>
        {item.toLabel && (
          <span
            className="truncate ps-8 text-caption text-slate-400 dark:text-slate-500"
            title={`إلى: ${item.toLabel}`}
          >
            إلى: {item.toLabel}
          </span>
        )}
      </div>

      <div className="hidden min-w-0 items-center gap-2 sm:flex">
        <span className="max-w-[52%] shrink-0 truncate">{subject}</span>
        <span className="text-slate-300 dark:text-slate-600">—</span>
        <span className="truncate text-meta text-slate-400 dark:text-slate-500">{item.snippet}</span>
      </div>

      <div className="hidden shrink-0 items-center gap-2.5 sm:flex">
        {item.hasAttachments && <Paperclip className="size-3.5 text-slate-400 dark:text-slate-500" />}
        {unreadDot}
        {date}
      </div>
    </>
  );

  return (
    <li>
      {asButton ? (
        <button type="button" onClick={() => onOpen(item.mailId, isUnread)} className={rowClassName}>
          {content}
        </button>
      ) : (
        <Link href={`/main/mail/${item.mailId}`} onClick={() => onOpen(item.mailId, isUnread)} className={rowClassName}>
          {content}
        </Link>
      )}
    </li>
  );
}

