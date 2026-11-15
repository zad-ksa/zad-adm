"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Check, ImagePlus, Megaphone, X } from "lucide-react";
import { Note, Spinner, btn, cx, field } from "@/components/console/ui";
import { Sheet, FooterStatus } from "@/components/console/overlays";
import { notify } from "@/components/console/toastBus";
import { PlatformRow } from "@/components/console/PlatformMark";
import MultiSelect from "@/components/console/MultiSelect";
import DateField from "@/components/console/DateField";
import TimeField from "@/components/console/TimeField";
import { uploadFile } from "@/lib/clientUpload";
import { ACCEPT_IMAGES } from "@/lib/uploadPurposes";
import type { MediaPlatformView, MediaPost } from "./MediaCalendar";

/**
 * لوحُ المنشور — رفعاً وتعديلاً، عند زادٍ وفي بوّابة الجمعية.
 *
 * والحقولُ هي هي للطرفين: متنٌ ويومٌ ووقتٌ ومنصّاتٌ ورابطٌ وصورة. فلو كُتب
 * نموذجان لافترقا عند أوّل حقلٍ يُضاف، فرفع موظّفٌ منشوراً وعدّلته الجمعيةُ
 * فأسقط تعديلُها حقلاً لم يكن في نموذجها.
 *
 * **والفعلُ يُحقَن ولا يُستورد**: زادٌ يُنشئ ويُعدِّل بأفعاله، والجمعيةُ تُعدِّل
 * بأفعالها — ولكلٍّ حارسُه. فلو استورد هذا اللوحُ فعلاً بعينه لحمل أحدَ
 * الطرفين إلى حارس الآخر.
 */

export type MediaPostDraft = {
  scheduledOn: string;
  scheduledAt: string | null;
  content: string;
  platforms: string[];
  imageUrl: string | null;
  imagePublicId: string | null;
  linkUrl: string | null;
};

export default function MediaPostSheet({
  title,
  subtitle,
  day,
  post,
  platforms,
  note: noteConfig,
  banner,
  savedMessage,
  submit,
  onClose,
  onSaved,
}: {
  title: string;
  subtitle?: string;
  /** يومُ الخليّة التي فُتح منها اللوحُ — مبدأُ منشورٍ جديد. */
  day: string;
  /** بغيره: رفعُ منشورٍ جديد. */
  post: MediaPost | null;
  platforms: MediaPlatformView[];
  /** السببُ: مطلوبٌ في حالاتٍ بعينها، وعنوانُه ونصُّه المساعد بحسب الطرف. */
  note?: { required: boolean; label: string; hint: string };
  /** تنبيهٌ أعلى اللوح — كتعديلِ منشورٍ معتمَد. */
  banner?: React.ReactNode;
  savedMessage: string;
  submit: (draft: MediaPostDraft, note: string) => Promise<{ error?: string; success?: boolean }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [content, setContent] = useState(post?.content ?? "");
  const [chosen, setChosen] = useState<string[]>(post?.platforms ?? []);
  const [date, setDate] = useState(post?.scheduledOn ?? day);
  const [time, setTime] = useState(post?.scheduledAt ?? "");
  const [link, setLink] = useState(post?.linkUrl ?? "");
  const [image, setImage] = useState<{ url: string; publicId: string } | null>(
    post?.imageUrl ? { url: post.imageUrl, publicId: post.imagePublicId ?? "" } : null
  );
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const needsNote = !!noteConfig?.required;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadFile(file, "media_post");
      setImage({ url: uploaded.url, publicId: uploaded.publicId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = () => {
    setError(null);
    start(async () => {
      const result = await submit(
        {
          scheduledOn: date,
          scheduledAt: time || null,
          content,
          platforms: chosen,
          imageUrl: image?.url ?? null,
          imagePublicId: image?.publicId ?? null,
          linkUrl: link || null,
        },
        note
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      notify("ok", savedMessage);
      onSaved();
    });
  };

  return (
    <Sheet
      title={title}
      subtitle={subtitle}
      leading={<Megaphone className="size-4 text-primary" />}
      onClose={onClose}
      onSubmit={onSubmit}
      busy={pending || uploading}
      footer={
        <FooterStatus error={error}>
          <button type="button" onClick={onClose} className={btn.ghost} disabled={pending}>
            إلغاء
          </button>
          <button type="submit" className={btn.primary} disabled={pending || uploading}>
            {pending ? <Spinner size={14} /> : <Check className="size-4" />}
            حفظ
          </button>
        </FooterStatus>
      }
    >
      <div className="space-y-3">
        {banner}

        <label className="block space-y-1.5">
          <span className="text-meta font-medium text-slate-600 dark:text-slate-300">نص المنشور</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            required
            placeholder="اكتب نص المنشور كما سينشر…"
            className={cx(field, "min-h-[8rem] resize-y leading-6")}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="block text-meta font-medium text-slate-600 dark:text-slate-300">يوم النشر</span>
            <DateField value={date} onChange={setDate} required withWeekday />
          </div>
          <div className="space-y-1.5">
            <span className="block text-meta font-medium text-slate-600 dark:text-slate-300">
              وقت النشر <span className="text-slate-400">(اختياري)</span>
            </span>
            <TimeField value={time} onChange={setTime} step={5} placeholder="بدون وقت" />
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-meta font-medium text-slate-600 dark:text-slate-300">المنصات</span>
          <MultiSelect
            label="منصات النشر"
            placeholder="اختر المنصات"
            countNoun="منصة"
            values={chosen}
            onChange={setChosen}
            options={platforms.map((p) => ({ value: p.key, label: p.name }))}
          />
          {chosen.length > 0 && (
            <PlatformRow
              platforms={chosen.map((key) => platforms.find((p) => p.key === key)!).filter(Boolean)}
              size={16}
              max={9}
            />
          )}
        </div>

        <label className="block space-y-1.5">
          <span className="text-meta font-medium text-slate-600 dark:text-slate-300">
            الرابط <span className="text-slate-400">(اختياري)</span>
          </span>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            type="url"
            inputMode="url"
            dir="ltr"
            placeholder="https://"
            className={field}
          />
        </label>

        <div className="space-y-1.5">
          <span className="block text-meta font-medium text-slate-600 dark:text-slate-300">
            الصورة <span className="text-slate-400">(اختياري)</span>
          </span>
          {image ? (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 dark:border-slate-800">
              <Image src={image.url} alt="" width={96} height={96} className="size-16 rounded-md object-cover" />
              <button type="button" onClick={() => setImage(null)} className={cx(btn.ghost, "h-8")}>
                <X className="size-3.5" />
                إزالة
              </button>
            </div>
          ) : (
            <>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT_IMAGES}
                className="hidden"
                onChange={(e) => void pick(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={cx(btn.ghost, "h-9")}
                disabled={uploading}
              >
                {uploading ? <Spinner size={14} /> : <ImagePlus className="size-4" />}
                اختيار صورة
              </button>
            </>
          )}
        </div>

        {needsNote && noteConfig && (
          <label className="block space-y-1.5">
            <span className="text-meta font-medium text-slate-600 dark:text-slate-300">{noteConfig.label}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              required
              placeholder={noteConfig.hint}
              className={cx(field, "resize-y leading-6")}
            />
          </label>
        )}
      </div>
    </Sheet>
  );
}

/** تنبيهُ تعديلِ منشورٍ معتمَد — نصُّه بحسب من يُعدِّل. */
export function ApprovedWarning({ children }: { children: React.ReactNode }) {
  return <Note tone="warn">{children}</Note>;
}
