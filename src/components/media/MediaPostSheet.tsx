"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Check, ImagePlus, Link2, Megaphone, Paperclip, UploadCloud, X } from "lucide-react";
import { Note, Spinner, btn, cx, field } from "@/components/console/ui";
import { Sheet, FooterStatus } from "@/components/console/overlays";
import { notify } from "@/components/console/toastBus";
import { PlatformRow } from "@/components/console/PlatformMark";
import MultiSelect from "@/components/console/MultiSelect";
import DateField from "@/components/console/DateField";
import TimeField from "@/components/console/TimeField";
import { uploadFile } from "@/lib/clientUpload";
import { ACCEPT_IMAGES } from "@/lib/uploadPurposes";
import HashtagText from "@/components/console/HashtagText";
import type { MediaAttachment } from "@/lib/mediaPostInput";
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
  /** عنوان التصميم. */
  title: string | null;
  /** نص التصميم — وهو ما يُعتمد. */
  content: string;
  /** نص المنشور (الوصف) — والهاشتاقات تُكتب ضمنه. */
  description: string | null;
  platforms: string[];
  imageUrl: string | null;
  imagePublicId: string | null;
  linkUrl: string | null;
  attachments: MediaAttachment[];
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
  const [titleText, setTitleText] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [description, setDescription] = useState(post?.description ?? "");
  const [files, setFiles] = useState<MediaAttachment[]>(() => post?.attachments ?? []);
  // طريقةُ إضافة المرفق: رابطٌ يُكتب أو ملفٌّ يُرفع — ولا يُعرض الصندوقان معاً،
  // فمن يرى حقلاً للرابط وحوضاً للرفع لا يعرف أيَّهما المطلوب.
  const [attachMode, setAttachMode] = useState<"LINK" | "FILE" | null>(null);
  const [linkDraft, setLinkDraft] = useState("");
  const [attaching, setAttaching] = useState(false);
  const attachRef = useRef<HTMLInputElement>(null);
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

  /** مرفقٌ جديد — ولا يُكرَّر رابطٌ موجود. */
  const addFile = (file: MediaAttachment) => {
    setFiles((current) => (current.some((f) => f.url === file.url) ? current : [...current, file]));
    setAttachMode(null);
    setLinkDraft("");
  };

  const pickAttachment = async (chosen: File | undefined) => {
    if (!chosen) return;
    setAttaching(true);
    setError(null);
    try {
      const uploaded = await uploadFile(chosen, "media_post");
      addFile({
        id: uploaded.publicId || uploaded.url,
        kind: "FILE",
        url: uploaded.url,
        publicId: uploaded.publicId,
        name: chosen.name,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر رفع المرفق");
    } finally {
      setAttaching(false);
    }
  };

  const addLink = () => {
    const url = linkDraft.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setError("رابط المرفق يجب أن يبدأ بـ http أو https");
      return;
    }
    setError(null);
    addFile({ id: url, kind: "LINK", url, name: null });
  };

  const onSubmit = () => {
    setError(null);
    start(async () => {
      const result = await submit(
        {
          scheduledOn: date,
          scheduledAt: time || null,
          title: titleText.trim() || null,
          content,
          description: description.trim() || null,
          platforms: chosen,
          imageUrl: image?.url ?? null,
          imagePublicId: image?.publicId ?? null,
          linkUrl: link || null,
          attachments: files,
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
          <span className="text-meta font-medium text-slate-600 dark:text-slate-300">عنوان التصميم</span>
          <input
            value={titleText}
            onChange={(e) => setTitleText(e.target.value)}
            placeholder="سطر قصير يُعرف به المنشور"
            className={field}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-meta font-medium text-slate-600 dark:text-slate-300">
            نص التصميم <span className="text-slate-400">(للاعتماد)</span>
          </span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            required
            placeholder="النص الذي يظهر في التصميم…"
            className={cx(field, "min-h-[7rem] resize-y leading-6")}
          />
        </label>

        {/* والهاشتاقات ضمن هذا النص لا في حقل لها: هكذا تُنسخ وتُلصق في المنصة،
            وتُعرض بالأزرق حيث تُقرأ (HashtagText). */}
        <label className="block space-y-1.5">
          <span className="text-meta font-medium text-slate-600 dark:text-slate-300">
            نص المنشور <span className="text-slate-400">(الوصف — والهاشتاقات ضمنه)</span>
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="الوصف كما يُنشر، ومعه الهاشتاقات: #زاد #تمكين"
            className={cx(field, "min-h-[7rem] resize-y leading-6")}
          />
          {description.trim() && (
            <HashtagText
              text={description}
              className="block rounded-md border border-slate-200 bg-slate-50 p-2 text-meta leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300"
            />
          )}
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

        {/*
          المرفقات: رابطٌ يُكتب أو ملفٌّ يُرفع عبر منصّة زاد — وتُختار الطريقةُ
          أوّلاً فيُفتح صندوقُها وحدَه. فحقلٌ للرابط وحوضٌ للرفع معروضان معاً
          يجعلان المرفقَ سؤالاً: أيُّهما المطلوب؟
        */}
        <div className="space-y-2">
          <span className="block text-meta font-medium text-slate-600 dark:text-slate-300">
            المرفقات <span className="text-slate-400">(اختياري)</span>
          </span>

          {files.length > 0 && (
            <ul className="space-y-1.5">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-2 dark:border-slate-800"
                >
                  {file.kind === "FILE" ? (
                    <Paperclip className="size-3.5 shrink-0 text-slate-400" />
                  ) : (
                    <Link2 className="size-3.5 shrink-0 text-slate-400" />
                  )}
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    dir={file.name ? undefined : "ltr"}
                    className="min-w-0 flex-1 truncate text-meta text-primary hover:underline"
                  >
                    {file.name || file.url}
                  </a>
                  <button
                    type="button"
                    onClick={() => setFiles((current) => current.filter((f) => f.id !== file.id))}
                    aria-label={"إزالة " + (file.name || file.url)}
                    className={cx(btn.ghost, "h-7 px-2")}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {attachMode === null ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setAttachMode("LINK")} className={cx(btn.ghost, "h-9")}>
                <Link2 className="size-4" />
                إضافة رابط
              </button>
              <button type="button" onClick={() => setAttachMode("FILE")} className={cx(btn.ghost, "h-9")}>
                <UploadCloud className="size-4" />
                رفع ملف
              </button>
            </div>
          ) : attachMode === "LINK" ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={linkDraft}
                onChange={(e) => setLinkDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLink();
                  }
                }}
                type="url"
                inputMode="url"
                dir="ltr"
                autoFocus
                placeholder="https://"
                className={cx(field, "min-w-0 flex-1")}
              />
              <button type="button" onClick={addLink} className={cx(btn.secondary, "h-9")} disabled={!linkDraft.trim()}>
                إضافة
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttachMode(null);
                  setLinkDraft("");
                }}
                className={cx(btn.ghost, "h-9")}
              >
                إلغاء
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={attachRef}
                type="file"
                className="hidden"
                onChange={(e) => void pickAttachment(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => attachRef.current?.click()}
                className={cx(btn.secondary, "h-9")}
                disabled={attaching}
              >
                {attaching ? <Spinner size={14} /> : <UploadCloud className="size-4" />}
                اختيار ملف من الجهاز
              </button>
              <button type="button" onClick={() => setAttachMode(null)} className={cx(btn.ghost, "h-9")}>
                إلغاء
              </button>
            </div>
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
