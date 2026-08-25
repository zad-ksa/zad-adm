"use client";

import Link from "next/link";
import Image from "next/image";
import { CheckSquare, Square, Star, Paperclip, User } from "lucide-react";
import type { MailListItem } from "./mailUtils";
import { formatMailDate } from "./mailUtils";

interface MailRowProps {
  item: MailListItem;
  isSelected: boolean;
  showStar: boolean;
  onToggleSelect: (rowId: string) => void;
  onToggleStar: (mailId: string) => void;
  onOpen: (mailId: string, isUnread: boolean) => void;
  /** Drafts aren't real single-mail pages yet — clicking one reopens the compose modal instead of navigating. */
  asButton?: boolean;
}

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

  // Two shapes, one component.
  //
  // Desktop keeps Gmail's single dense line. On a phone that line had five
  // columns competing for ~360px, so the sender, the subject and the snippet
  // each got a couple of words before truncating — the row told you nothing.
  // Mobile stacks instead: sender + date, then subject, then snippet.
  const rowClassName = `group flex sm:grid sm:grid-cols-[1.75rem_1.75rem_minmax(6rem,8.5rem)_minmax(0,1fr)_auto] items-start sm:items-center gap-2 min-h-10 px-3 py-2 sm:py-1.5 border-s-4 transition-all relative w-full text-right ${
    isSelected
      ? "bg-secondary/[0.08] dark:bg-secondary/[0.14] shadow-[var(--mail-shadow-row-sel)] border-transparent"
      : isUnread
        ? "border-s-primary bg-white dark:bg-slate-900 shadow-[var(--mail-shadow-unread)] hover:bg-primary/[0.04] dark:hover:bg-primary/[0.08]"
        : "border-transparent bg-slate-50/70 dark:bg-slate-800/30 hover:bg-primary/[0.04] dark:hover:bg-primary/[0.07] hover:shadow-[var(--mail-shadow-row-hover)] hover:z-10"
  }`;

  const checkbox = (
    <span
      role="checkbox"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleSelect(item.rowId);
      }}
      className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-teal-300 cursor-pointer shrink-0"
    >
      {isSelected ? <CheckSquare className="w-4 h-4 text-primary dark:text-teal-300" /> : <Square className="w-4 h-4" />}
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
      className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg shrink-0"
      title={item.isStarred ? "إزالة النجمة" : "تمييز بنجمة"}
    >
      <Star
        className={`w-4 h-4 transition-colors ${
          item.isStarred
            ? "fill-secondary text-secondary dark:fill-amber-400 dark:text-amber-400 drop-shadow-[var(--mail-glow-star)]"
            : "text-slate-300 dark:text-slate-600 hover:text-secondary/70 dark:hover:text-amber-400/70"
        }`}
      />
    </button>
  ) : (
    <span className="hidden sm:block" />
  );

  const avatar = (
    <div className="w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
      {item.avatarUrl ? (
        <Image src={item.avatarUrl} alt={item.displayName} width={24} height={24} className="object-cover w-full h-full" />
      ) : (
        <User className="w-3 h-3 text-primary dark:text-teal-300" />
      )}
    </div>
  );

  const senderName = (
    <span
      className={`truncate text-[length:var(--mail-fs-sender)] ${
        isUnread ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300"
      }`}
    >
      {item.displayName}
    </span>
  );

  const date = (
    <span
      className={`whitespace-nowrap text-[length:var(--mail-fs-meta)] ${
        isUnread ? "font-bold text-primary dark:text-teal-300" : "font-medium text-slate-400 dark:text-slate-500"
      }`}
    >
      {formatMailDate(item.createdAt)}
    </span>
  );

  const subject = (
    <span
      className={`text-[length:var(--mail-fs-subject)] ${
        isUnread ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300"
      }`}
    >
      {item.subject}
    </span>
  );

  const content = (
    <>
      {checkbox}
      {star}

      {/* Mobile: one stacked block. The avatar keeps the sender line anchored,
          and the date sits opposite it where the eye already looks for it. */}
      <div className="sm:hidden min-w-0 flex-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-2 min-w-0">
          {avatar}
          <span className="min-w-0 flex-1 truncate">{senderName}</span>
          {item.hasAttachments && <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          {isUnread && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-teal-400 shrink-0" />
          )}
          {date}
        </div>
        <span className="truncate">{subject}</span>
        <span className="truncate text-[length:var(--mail-fs-snippet)] text-slate-400 dark:text-slate-500">
          {item.snippet}
        </span>
      </div>

      {/* Desktop: the original dense single line. */}
      <div className="hidden sm:flex min-w-0 items-center gap-2">
        {avatar}
        {senderName}
      </div>

      <div className="hidden sm:flex min-w-0 items-center gap-2">
        <span className="shrink-0 truncate max-w-[52%]">{subject}</span>
        <span className="text-slate-300 dark:text-slate-600">—</span>
        <span className="truncate text-[length:var(--mail-fs-snippet)] text-slate-400 dark:text-slate-500">
          {item.snippet}
        </span>
      </div>

      <div className="hidden sm:flex items-center gap-2.5 shrink-0">
        {item.hasAttachments && <Paperclip className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />}
        {isUnread && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-teal-400 shadow-[0_0_0_3px_rgb(15_118_110_/_0.15)]" />
        )}
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
