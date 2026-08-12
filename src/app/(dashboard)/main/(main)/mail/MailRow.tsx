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

  const rowClassName = `group grid grid-cols-[2rem_2rem_minmax(0,1fr)_auto] sm:grid-cols-[2rem_2rem_minmax(7.5rem,11rem)_minmax(0,1fr)_auto] items-center gap-4 min-h-10 px-4 py-2 border-s-4 transition-all relative w-full text-right ${
    isSelected
      ? "bg-secondary/[0.08] dark:bg-secondary/[0.14] shadow-[var(--mail-shadow-row-sel)] border-transparent"
      : isUnread
        ? "border-s-primary bg-white dark:bg-slate-900 shadow-[var(--mail-shadow-unread)] hover:bg-primary/[0.04] dark:hover:bg-primary/[0.08]"
        : "border-transparent bg-slate-50/70 dark:bg-slate-800/30 hover:bg-primary/[0.04] dark:hover:bg-primary/[0.07] hover:shadow-[var(--mail-shadow-row-hover)] hover:z-10"
  }`;

  const content = (
    <>
      <span
        role="checkbox"
        aria-checked={isSelected}
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleSelect(item.rowId);
        }}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-teal-300 cursor-pointer"
      >
        {isSelected ? <CheckSquare className="w-4 h-4 text-primary dark:text-teal-300" /> : <Square className="w-4 h-4" />}
      </span>

      {showStar ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleStar(item.mailId);
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg"
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
        <span />
      )}

      <div className="min-w-0 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
          {item.avatarUrl ? (
            <Image src={item.avatarUrl} alt={item.displayName} width={24} height={24} className="object-cover w-full h-full" />
          ) : (
            <User className="w-3 h-3 text-primary dark:text-teal-300" />
          )}
        </div>
        <span
          className={`truncate text-[length:var(--mail-fs-sender)] ${
            isUnread ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300"
          }`}
        >
          {item.displayName}
        </span>
      </div>

      <div className="min-w-0 flex items-center gap-2">
        <span
          className={`shrink-0 truncate max-w-[45%] text-[length:var(--mail-fs-subject)] ${
            isUnread ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300"
          }`}
        >
          {item.subject}
        </span>
        <span className="text-slate-300 dark:text-slate-600">—</span>
        <span className="truncate text-[length:var(--mail-fs-snippet)] text-slate-400 dark:text-slate-500">{item.snippet}</span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {item.hasAttachments && <Paperclip className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />}
        {isUnread && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-teal-400 shadow-[0_0_0_3px_rgb(15_118_110_/_0.15)]" />
        )}
        <span
          className={`whitespace-nowrap text-[length:var(--mail-fs-meta)] ${
            isUnread ? "font-bold text-primary dark:text-teal-300" : "font-medium text-slate-400 dark:text-slate-500"
          }`}
        >
          {formatMailDate(item.createdAt)}
        </span>
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
