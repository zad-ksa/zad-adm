"use client";

// معاينةُ الوثيقة كما ستُنزَّل: يُبنى ملفُّ Word نفسُه (في كليشة الجمعية إن كانت
// لها كليشة) ويُعرض صفحاتٍ في المتصفّح — فالعناوين والجداول والرأس والتذييل
// تظهر كما في Word. وهي للعرض فقط؛ التعديلُ بطلبٍ للذكاء الاصطناعي، واللمساتُ
// الأخيرة في Word بعد التنزيل.

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { buildProjectDocx } from "@/lib/exportProjectDocx";
import { getProjectBuilderLetterhead } from "@/app/actions/projectBuilder";

// الكليشةُ تُجلب مرّةً لكلِّ جمعيةٍ في الجلسة — المعاينةُ تُعاد مراراً أثناء الكتابة.
const letterheads = new Map<string, Promise<ArrayBuffer | null>>();

export function loadLetterhead(charityId: string): Promise<ArrayBuffer | null> {
  let p = letterheads.get(charityId);
  if (!p) {
    p = (async () => {
      const lh = await getProjectBuilderLetterhead(charityId);
      if (!lh) return null;
      const res = await fetch(
        `/api/files/download?url=${encodeURIComponent(lh.url)}`,
      );
      if (!res.ok) throw new Error("تعذّر تحميل كليشة الجمعية");
      return res.arrayBuffer();
    })();
    // فشلٌ عابر لا يُحفظ — تُعاد المحاولة في المرّة التالية.
    p.catch(() => letterheads.delete(charityId));
    letterheads.set(charityId, p);
  }
  return p;
}

export function DocPreview({
  content,
  charityId,
  live = false,
  className = "",
}: {
  content: string;
  charityId?: string | null;
  /** تُكتب الآن: تُحدَّث كلَّ ثانيتين وتتبع آخرَ الصفحة. */
  live?: boolean;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const latest = useRef(content);
  const rendered = useRef<string | null>(null);
  const busy = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  // قبل أثر الرسم أدناه، فيرى آخرَ نصّ.
  useEffect(() => {
    latest.current = content;
  }, [content]);

  const renderNow = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      // تغيّر النصُّ أثناء الرسم (بعد تعديلٍ مثلاً)؟ تُعاد بآخر نصّ. وأثناء الكتابة
      // يتولّى المؤقّتُ ذلك.
      for (;;) {
        const text = latest.current;
        if (!text.trim() || text === rendered.current) break;
        const [{ renderAsync }, letterhead] = await Promise.all([
          import("docx-preview"),
          charityId
            ? loadLetterhead(charityId).catch(() => null)
            : Promise.resolve(null),
        ]);
        const blob = await buildProjectDocx(text, letterhead);
        // تُرسم في عنصرٍ جانبيّ ثم تُبدَّل دفعةً واحدة — بلا وميضٍ بين التحديثات.
        const next = document.createElement("div");
        await renderAsync(blob, next, undefined, {
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          renderHeaders: true,
          renderFooters: true,
          useBase64URL: true,
        });
        const host = hostRef.current;
        if (!host) break;
        const follow =
          live && host.scrollHeight - host.scrollTop - host.clientHeight < 80;
        // جداولُ الوثيقة من اليمين إلى اليسار في Word، والمكتبةُ لا تقرأ هذا
        // الإعدادَ فترسمها معكوسة — فيُضبط هنا.
        next.querySelectorAll("table").forEach((t) => (t.style.direction = "rtl"));
        // الصفحةُ بعرض A4: تُصغَّر لتسع الشاشة بدل تمريرٍ أفقيّ.
        const wrapper = next.querySelector<HTMLElement>(".docx-wrapper");
        const page = next.querySelector<HTMLElement>("section.docx");
        if (wrapper) {
          wrapper.style.background = "transparent";
          wrapper.style.padding = "16px 16px 0";
          const pageWidth = page ? parseFloat(page.style.width) * 96 / 72 || 794 : 794;
          const scale = Math.min(1, (host.clientWidth - 16) / (pageWidth + 32));
          if (scale < 1) wrapper.style.setProperty("zoom", String(scale));
        }
        host.replaceChildren(...Array.from(next.childNodes));
        if (follow || (live && !rendered.current))
          host.scrollTop = host.scrollHeight;
        rendered.current = text;
        setReady(true);
        setError("");
        if (live) break;
      }
    } catch (e) {
      setError(
        e instanceof Error && e.message ? e.message : "تعذّر عرض المعاينة",
      );
    } finally {
      busy.current = false;
    }
  }, [charityId, live]);

  const contentKey = live ? null : content;
  useEffect(() => {
    void renderNow();
    if (!live) return;
    const id = setInterval(() => void renderNow(), 2000);
    return () => clearInterval(id);
  }, [renderNow, live, contentKey]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 ${className}`}
    >
      {!ready && !error && (
        <div className="flex items-center justify-center gap-2 p-10 text-meta text-slate-500">
          <Loader2 className="size-4 animate-spin" /> تجهيز المعاينة…
        </div>
      )}
      {error && <div className="p-4 text-meta text-rose-600">{error}</div>}
      <div
        ref={hostRef}
        dir="ltr"
        className="doc-preview max-h-[640px] overflow-auto bg-slate-200 dark:bg-slate-900"
      />
    </div>
  );
}
