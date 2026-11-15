"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import NotificationBell, { type BellNotice } from "@/components/console/NotificationBell";
import { timeAgoArabic } from "@/lib/dateUtils";
import {
  deleteAllCharityNotices,
  deleteCharityNotice,
  listCharityNotices,
  markAllCharityNoticesRead,
  type CharityNotice,
} from "@/app/actions/charityNotifications";

/**
 * جرسُ إشعارات حساب الجمعية في البوّابة.
 *
 * ويُجلب أوّلُ عددٍ في الخادم مع الصفحة، فلا يَرِد الجرسُ فارغاً ثمّ يقفز عددُه
 * بعد لحظة. ويُعاد الجلبُ عند كلِّ فتحةٍ: البوّابةُ لا تُعاد تركيباً عبر
 * التنقّل، فلو لم يُعَد الجلبُ بقي العددُ كما كان أوّلَ الزيارة.
 */
export default function PortalNotices({
  initial,
  className,
}: {
  initial: { notices: CharityNotice[]; unread: number };
  className?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [, start] = useTransition();

  const items: BellNotice[] = data.notices.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    link: n.link,
    isRead: n.isRead,
    at: n.at,
  }));

  const refresh = () => {
    start(async () => {
      const next = await listCharityNotices();
      setData(next);
    });
  };

  return (
    <NotificationBell
      className={className}
      items={items}
      unread={data.unread}
      emptyText="لا إشعارات بعد"
      relativeTime={(iso) => timeAgoArabic(new Date(iso))}
      onOpen={() => {
        // العدّادُ يُصفَّر هنا لا في الجرس: هو خبرٌ يملكه هذا المكوّن، والجرسُ
        // يعرضه. ثمّ يُسَم المقروءُ ويُعاد الجلبُ ليظهر ما وصل بعد تحميل الصفحة.
        setData((current) => ({ ...current, unread: 0 }));
        start(async () => {
          await markAllCharityNoticesRead();
          const next = await listCharityNotices();
          setData(next);
        });
      }}
      onPick={(notice) => {
        if (notice.link) router.push(notice.link);
      }}
      onDelete={(notice) => {
        setData((current) => ({
          notices: current.notices.filter((n) => n.id !== notice.id),
          unread: current.unread,
        }));
        start(async () => {
          await deleteCharityNotice(notice.id);
          refresh();
        });
      }}
      onClearAll={() => {
        setData({ notices: [], unread: 0 });
        start(async () => {
          await deleteAllCharityNotices();
        });
      }}
    />
  );
}
