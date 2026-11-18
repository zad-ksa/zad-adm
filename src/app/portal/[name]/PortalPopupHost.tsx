"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog } from "@/components/console/Dialog";
import { btn } from "@/components/console/ui";
import { dismissPortalPopup, fetchPortalPopup, type LivePopup } from "@/app/actions/portalPopups";

/**
 * الإشعارُ الانبثاقيُّ في البوّابة: يُسأل عنه الخادمُ عند فتح كلِّ صفحة.
 *
 * **ولمَ يُسأل الخادمُ بالمسار بدل أن يُحمَّل مع التخطيط**: التخطيطُ لا يعرف
 * المسارَ الحالي (هو واحدٌ لكلِّ صفحات البوّابة)، والمسارُ هو شرطُ الظهور.
 * والنداءُ خفيف: صفٌّ أو لا شيء، ويُطلب بعد أن تُرسم الصفحة فلا يؤخّرها.
 *
 * **وما يُعرض يُقرّره الخادم**: الموضعُ والجمعيةُ والفترةُ وما أُغلق من قبل —
 * أربعةُ شروطٍ لا يُسأل المتصفّحُ عنها، فلا يُعرض بطلبٍ مصنوع.
 *
 * **والإغلاقُ يُسجَّل لصاحبه** إن كان الإشعارُ «مرّةً واحدة»: يُكتب الصفُّ ثمّ
 * تُخفى النافذة، ولا يُنتظر الخادمُ — فإغلاقٌ لا يُستجاب له فوراً يُفتح مرّتين.
 */
export default function PortalPopupHost() {
  const pathname = usePathname();
  // والمسارُ محفوظٌ مع الإشعار: فما جاء لصفحةٍ لا يُعرض في التي بعدها — ولو
  // لم يَعُد الخادمُ بشيءٍ لها بعد. وبه يُستغنى عن مسحٍ في أوّل كلِّ أثر،
  // وهو ما تمنعه قاعدةُ «لا setState في أوّل الأثر».
  const [found, setFound] = useState<{ path: string; popup: LivePopup } | null>(null);

  useEffect(() => {
    let alive = true;
    fetchPortalPopup(pathname)
      .then((next) => {
        if (alive && next) setFound({ path: pathname, popup: next });
      })
      .catch(() => {
        // إشعارٌ لا يصل لا يُعطّل صفحة.
      });
    return () => {
      alive = false;
    };
  }, [pathname]);

  const popup = found && found.path === pathname ? found.popup : null;
  if (!popup) return null;

  const close = () => {
    setFound(null);
    if (popup.repeatMode !== "EVERY") void dismissPortalPopup(popup.id);
  };

  return (
    <Dialog
      title={popup.title}
      onClose={close}
      footer={
        <button type="button" onClick={close} className={btn.primary}>
          حسنا
        </button>
      }
    >
      <p className="whitespace-pre-line text-body leading-7 text-slate-700 dark:text-slate-200">{popup.body}</p>
    </Dialog>
  );
}
