"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  Save,
  ExternalLink,
  RefreshCw,
  Upload,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Moon,
  Sun,
} from "lucide-react";
import { updateLandingConfig } from "@/app/actions/landing";
import { uploadFile, type UploadProgress as Progress } from "@/lib/clientUpload";
import UploadProgress from "@/components/ui/UploadProgress";
import SuccessToast from "@/components/ui/SuccessToast";
import {
  ANIMATION_LABELS,
  DEFAULT_CONTENT,
  LANDING_PREVIEW_MESSAGE,
  makeDefaultLandingConfig,
  SECTION_LABELS,
  SECTION_ORDER,
  type AnimationType,
  type BackgroundType,
  type LandingConfig,
  type LandingTheme,
  type LinkItem,
  type SectionKey,
  type TitledItem,
} from "@/lib/landing";

// ── مخطط حقول المحتوى لكل فقرة ────────────────────────────────────────────────

type FieldDef =
  | { kind: "text"; name: string; label: string }
  | { kind: "textarea"; name: string; label: string }
  | { kind: "stringList"; name: string; label: string; itemLabel: string }
  | { kind: "linkList"; name: string; label: string }
  | { kind: "titledList"; name: string; label: string };

const CONTENT_FIELDS: Record<SectionKey, FieldDef[]> = {
  navbar: [
    { kind: "linkList", name: "links", label: "روابط القائمة" },
    { kind: "text", name: "loginLabel", label: "نص زر تسجيل الدخول" },
  ],
  hero: [
    { kind: "text", name: "badge", label: "الشارة العلوية" },
    { kind: "text", name: "titleLine1", label: "العنوان — السطر الأول" },
    { kind: "text", name: "titleLine2", label: "العنوان — السطر الثاني (ملوّن)" },
    { kind: "textarea", name: "subtitle", label: "الوصف" },
    { kind: "text", name: "primaryCtaLabel", label: "الزر الرئيسي" },
    { kind: "text", name: "secondaryCtaLabel", label: "الزر الثانوي" },
  ],
  intro: [
    { kind: "text", name: "title", label: "العنوان" },
    { kind: "stringList", name: "paragraphs", label: "الفقرات", itemLabel: "فقرة" },
  ],
  whoweare: [
    { kind: "text", name: "title", label: "العنوان" },
    { kind: "textarea", name: "body", label: "النص" },
  ],
  visionmission: [
    { kind: "text", name: "visionTitle", label: "عنوان الرؤية" },
    { kind: "textarea", name: "visionBody", label: "نص الرؤية" },
    { kind: "text", name: "missionTitle", label: "عنوان الرسالة" },
    { kind: "textarea", name: "missionBody", label: "نص الرسالة" },
  ],
  values: [
    { kind: "text", name: "title", label: "العنوان" },
    { kind: "text", name: "subtitle", label: "العنوان الفرعي" },
    { kind: "titledList", name: "items", label: "القيم" },
  ],
  goalsfeatures: [
    { kind: "text", name: "goalsTitle", label: "عنوان الأهداف" },
    { kind: "stringList", name: "goals", label: "الأهداف", itemLabel: "هدف" },
    { kind: "text", name: "featuresTitle", label: "عنوان «ما يميزنا»" },
    { kind: "titledList", name: "features", label: "عناصر «ما يميزنا»" },
  ],
  footer: [
    { kind: "textarea", name: "about", label: "نبذة" },
    { kind: "text", name: "quickLinksTitle", label: "عنوان الروابط السريعة" },
    { kind: "linkList", name: "quickLinks", label: "الروابط السريعة" },
    { kind: "text", name: "contactTitle", label: "عنوان «تواصل معنا»" },
    { kind: "textarea", name: "address", label: "العنوان" },
    { kind: "text", name: "phone", label: "الهاتف" },
    { kind: "text", name: "email", label: "البريد" },
    { kind: "text", name: "copyright", label: "نص الحقوق" },
    { kind: "linkList", name: "bottomLinks", label: "روابط أسفل التذييل" },
  ],
};

const BG_TYPES: { value: BackgroundType; label: string }[] = [
  { value: "none", label: "بدون" },
  { value: "solid", label: "لون مصمت" },
  { value: "gradient", label: "تدرّج" },
  { value: "image", label: "صورة" },
];

// ── مكوّنات إدخال مساعدة ──────────────────────────────────────────────────────

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">{children}</label>;
}

const inputCls =
  "w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary/40 text-xs bg-white dark:bg-slate-900 outline-none";

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />;
}

function TextArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className={`${inputCls} leading-relaxed resize-y min-h-[64px]`}
    />
  );
}

function ColorInput({
  value,
  onChange,
  onClear,
}: {
  value: string | null;
  onChange: (v: string) => void;
  onClear?: () => void;
}) {
  const shown = value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#0f766e";
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={shown}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-10 shrink-0 rounded-md border border-slate-200 dark:border-slate-600 bg-transparent cursor-pointer"
      />
      <input
        type="text"
        dir="ltr"
        value={value ?? ""}
        placeholder="افتراضي"
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} font-mono`}
      />
      {onClear && value != null && (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-[10px] font-bold text-slate-400 hover:text-primary px-1"
        >
          مسح
        </button>
      )}
    </div>
  );
}

function RangeInput({
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-primary"
      />
      <span className="text-[11px] font-bold text-slate-500 tabular-nums w-12 text-left">
        {format ? format(value) : value}
      </span>
    </div>
  );
}

function SegButtons<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
            value === o.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── محرّرات القوائم ──────────────────────────────────────────────────────────

function ListControls({
  index,
  total,
  onUp,
  onDown,
  onRemove,
}: {
  index: number;
  total: number;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button type="button" onClick={onUp} disabled={index === 0} className="p-1 text-slate-400 hover:text-primary disabled:opacity-30">
        <ArrowUp className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={index === total - 1}
        className="p-1 text-slate-400 hover:text-primary disabled:opacity-30"
      >
        <ArrowDown className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={onRemove} className="p-1 text-slate-400 hover:text-red-500">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

function StringListEditor({
  items,
  itemLabel,
  onChange,
}: {
  items: string[];
  itemLabel: string;
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2">
          <textarea
            value={it}
            rows={2}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            className={`${inputCls} resize-y`}
          />
          <ListControls
            index={i}
            total={items.length}
            onUp={() => onChange(move(items, i, i - 1))}
            onDown={() => onChange(move(items, i, i + 1))}
            onRemove={() => onChange(items.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80"
      >
        <Plus className="w-3.5 h-3.5" /> إضافة {itemLabel}
      </button>
    </div>
  );
}

function LinkListEditor({ items, onChange }: { items: LinkItem[]; onChange: (v: LinkItem[]) => void }) {
  const set = (i: number, patch: Partial<LinkItem>) =>
    onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex-1 grid grid-cols-2 gap-2">
            <input
              type="text"
              value={it.label}
              placeholder="النص"
              onChange={(e) => set(i, { label: e.target.value })}
              className={inputCls}
            />
            <input
              type="text"
              dir="ltr"
              value={it.href}
              placeholder="#anchor أو /path"
              onChange={(e) => set(i, { href: e.target.value })}
              className={`${inputCls} font-mono`}
            />
          </div>
          <ListControls
            index={i}
            total={items.length}
            onUp={() => onChange(move(items, i, i - 1))}
            onDown={() => onChange(move(items, i, i + 1))}
            onRemove={() => onChange(items.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { label: "", href: "#" }])}
        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80"
      >
        <Plus className="w-3.5 h-3.5" /> إضافة رابط
      </button>
    </div>
  );
}

function TitledListEditor({ items, onChange }: { items: TitledItem[]; onChange: (v: TitledItem[]) => void }) {
  const set = (i: number, patch: Partial<TitledItem>) =>
    onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2 border border-slate-100 dark:border-slate-700 rounded-lg p-2">
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={it.title}
              placeholder="العنوان"
              onChange={(e) => set(i, { title: e.target.value })}
              className={`${inputCls} font-bold`}
            />
            <textarea
              value={it.description}
              rows={2}
              placeholder="الوصف"
              onChange={(e) => set(i, { description: e.target.value })}
              className={`${inputCls} resize-y`}
            />
          </div>
          <ListControls
            index={i}
            total={items.length}
            onUp={() => onChange(move(items, i, i - 1))}
            onDown={() => onChange(move(items, i, i + 1))}
            onRemove={() => onChange(items.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { title: "", description: "" }])}
        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80"
      >
        <Plus className="w-3.5 h-3.5" /> إضافة عنصر
      </button>
    </div>
  );
}

// ── المحرّر ──────────────────────────────────────────────────────────────────

export default function LandingSettingsClient({ initialConfig }: { initialConfig: LandingConfig }) {
  const [draft, setDraft] = useState<LandingConfig>(initialConfig);
  const [open, setOpen] = useState<SectionKey | null>("hero");
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Partial<Record<SectionKey, Progress | null>>>({});
  const [dirty, setDirty] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const update = useCallback((fn: (d: LandingConfig) => void) => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
    setDirty(true);
  }, []);

  // بثّ المسودّة إلى إطار المعاينة عند كل تغيير، وعند إعلان الإطار جاهزيته.
  const postDraft = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: LANDING_PREVIEW_MESSAGE, config: draft },
      window.location.origin
    );
  }, [draft]);

  useEffect(() => {
    postDraft();
  }, [postDraft]);

  useEffect(() => {
    function onReady(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === `${LANDING_PREVIEW_MESSAGE}-ready`) postDraft();
    }
    window.addEventListener("message", onReady);
    return () => window.removeEventListener("message", onReady);
  }, [postDraft]);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateLandingConfig(draft);
      if (res.success) {
        setToast("تم حفظ إعدادات الواجهة الرئيسية");
        setDirty(false);
      } else {
        setError(res.error || "فشل الحفظ");
      }
    });
  };

  const resetSection = (key: SectionKey) => {
    if (!confirm(`إرجاع فقرة «${SECTION_LABELS[key]}» إلى الوضع الافتراضي؟`)) return;
    update((d) => {
      d.sections[key] = makeDefaultLandingConfig().sections[key];
    });
  };

  const handleUpload = async (key: SectionKey, file: File) => {
    setError(null);
    try {
      const uploaded = await uploadFile(file, "landing_bg", (percent) =>
        setUploads((u) => ({ ...u, [key]: { fileName: file.name, percent, index: 1, total: 1 } }))
      );
      update((d) => {
        const bg = d.sections[key].style.background;
        bg.type = "image";
        bg.image = {
          url: uploaded.url,
          publicId: uploaded.publicId,
          opacity: bg.image?.opacity ?? 1,
          overlayColor: bg.image?.overlayColor ?? "#0f766e",
          overlayOpacity: bg.image?.overlayOpacity ?? 0.35,
          blur: bg.image?.blur ?? 0,
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل رفع الصورة");
    } finally {
      setUploads((u) => ({ ...u, [key]: null }));
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-6" dir="rtl">
      {/* عمود الضوابط */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 sticky top-0 z-20 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur py-2 -mt-2">
          <button
            onClick={save}
            disabled={isPending || !dirty}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md font-bold text-xs transition-all disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {dirty ? "حفظ التغييرات" : "محفوظ"}
          </button>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold text-slate-500 hover:text-primary rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <ExternalLink className="w-4 h-4" /> فتح الموقع
          </a>
        </div>

        {/* ثيم الواجهة كلها */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            {draft.theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            وضع الواجهة كاملةً
          </div>
          <SegButtons<LandingTheme>
            options={[
              { value: "light", label: "فاتح" },
              { value: "dark", label: "داكن" },
            ]}
            value={draft.theme}
            onChange={(v) => update((d) => void (d.theme = v))}
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-bold border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {SECTION_ORDER.map((key) => {
          const section = draft.sections[key];
          const isOpen = open === key;
          return (
            <div
              key={key}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : key)}
                  className="flex-1 flex items-center gap-2 text-right"
                >
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{SECTION_LABELS[key]}</span>
                  {!section.enabled && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                      مخفية
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  title={section.enabled ? "إخفاء الفقرة" : "إظهار الفقرة"}
                  onClick={() => update((d) => void (d.sections[key].enabled = !d.sections[key].enabled))}
                  className={`p-1.5 rounded-lg transition-colors ${
                    section.enabled ? "text-primary hover:bg-primary/10" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {section.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  title="إرجاع للافتراضي"
                  onClick={() => resetSection(key)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {isOpen && (
                <div className="px-3 pb-4 pt-1 space-y-5 border-t border-slate-100 dark:border-slate-700">
                  {/* المحتوى */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider pt-2">النصوص</h4>
                    {CONTENT_FIELDS[key].map((f) => {
                      const val = (section.content[f.name] ?? DEFAULT_CONTENT[key][f.name]) as unknown;
                      const setVal = (v: unknown) => update((d) => void (d.sections[key].content[f.name] = v));
                      return (
                        <div key={f.name}>
                          <FieldLabel>{f.label}</FieldLabel>
                          {f.kind === "text" && <TextInput value={String(val ?? "")} onChange={setVal} />}
                          {f.kind === "textarea" && <TextArea value={String(val ?? "")} onChange={setVal} />}
                          {f.kind === "stringList" && (
                            <StringListEditor items={(val as string[]) ?? []} itemLabel={f.itemLabel} onChange={setVal} />
                          )}
                          {f.kind === "linkList" && (
                            <LinkListEditor items={(val as LinkItem[]) ?? []} onChange={setVal} />
                          )}
                          {f.kind === "titledList" && (
                            <TitledListEditor items={(val as TitledItem[]) ?? []} onChange={setVal} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* الخلفية */}
                  <BackgroundControls
                    sectionKey={key}
                    section={section}
                    update={update}
                    onUpload={handleUpload}
                    uploadProgress={uploads[key] ?? null}
                  />

                  {/* النص — لون/حجم/محاذاة */}
                  <TextControls sectionKey={key} section={section} update={update} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* عمود المعاينة */}
      <div className="xl:sticky xl:top-4 h-fit">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400">معاينة حية</span>
          <button
            type="button"
            onClick={() => {
              if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-primary"
          >
            <RefreshCw className="w-3.5 h-3.5" /> تحديث
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white shadow-sm">
          <iframe
            ref={iframeRef}
            src="/landing-preview"
            title="معاينة الواجهة الرئيسية"
            className="w-full h-[78vh] bg-white"
          />
        </div>
      </div>

      <SuccessToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

// ── ضوابط الخلفية ────────────────────────────────────────────────────────────

function BackgroundControls({
  sectionKey,
  section,
  update,
  onUpload,
  uploadProgress,
}: {
  sectionKey: SectionKey;
  section: LandingConfig["sections"][SectionKey];
  update: (fn: (d: LandingConfig) => void) => void;
  onUpload: (key: SectionKey, file: File) => void;
  uploadProgress: Progress | null;
}) {
  const bg = section.style.background;
  const setBg = (fn: (b: LandingConfig["sections"][SectionKey]["style"]["background"]) => void) =>
    update((d) => fn(d.sections[sectionKey].style.background));

  const animOptions = (Object.keys(ANIMATION_LABELS) as AnimationType[]).map((v) => ({
    value: v,
    label: ANIMATION_LABELS[v],
  }));

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider pt-2">الخلفية</h4>

      <SegButtons options={BG_TYPES} value={bg.type} onChange={(v) => setBg((b) => void (b.type = v))} />

      {bg.type === "solid" && (
        <div>
          <FieldLabel>اللون</FieldLabel>
          <ColorInput value={bg.color} onChange={(v) => setBg((b) => void (b.color = v))} />
        </div>
      )}

      {bg.type === "gradient" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>من</FieldLabel>
              <ColorInput value={bg.gradient.from} onChange={(v) => setBg((b) => void (b.gradient.from = v))} />
            </div>
            <div>
              <FieldLabel>إلى</FieldLabel>
              <ColorInput value={bg.gradient.to} onChange={(v) => setBg((b) => void (b.gradient.to = v))} />
            </div>
          </div>
          <div>
            <FieldLabel>الزاوية</FieldLabel>
            <RangeInput
              value={bg.gradient.angle}
              min={0}
              max={360}
              step={5}
              onChange={(v) => setBg((b) => void (b.gradient.angle = v))}
              format={(v) => `${v}°`}
            />
          </div>
        </div>
      )}

      {bg.type === "image" && (
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-500 hover:border-primary hover:text-primary cursor-pointer">
            <Upload className="w-4 h-4" />
            {bg.image ? "تغيير الصورة" : "رفع صورة"}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(sectionKey, f);
                e.target.value = "";
              }}
            />
          </label>
          {uploadProgress && <UploadProgress progress={uploadProgress} />}
          {bg.image && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bg.image.url} alt="" className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
              <div>
                <FieldLabel>شفافية الصورة</FieldLabel>
                <RangeInput
                  value={bg.image.opacity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => setBg((b) => void (b.image && (b.image.opacity = v)))}
                  format={(v) => `${Math.round(v * 100)}%`}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <FieldLabel>لون التأثير</FieldLabel>
                  <ColorInput
                    value={bg.image.overlayColor}
                    onChange={(v) => setBg((b) => void (b.image && (b.image.overlayColor = v)))}
                  />
                </div>
                <div>
                  <FieldLabel>شدّة التأثير اللوني</FieldLabel>
                  <RangeInput
                    value={bg.image.overlayOpacity}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(v) => setBg((b) => void (b.image && (b.image.overlayOpacity = v)))}
                    format={(v) => `${Math.round(v * 100)}%`}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>ضبابية (blur)</FieldLabel>
                <RangeInput
                  value={bg.image.blur}
                  min={0}
                  max={40}
                  step={1}
                  onChange={(v) => setBg((b) => void (b.image && (b.image.blur = v)))}
                  format={(v) => `${v}px`}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* تأثير حركي لا نهائي — متاح مع أي نوع خلفية */}
      <div className="pt-1">
        <FieldLabel>تأثير حركي على الخلفية</FieldLabel>
        <SegButtons
          options={animOptions}
          value={bg.animation.type}
          onChange={(v) => setBg((b) => void (b.animation.type = v))}
        />
      </div>
      {bg.animation.type !== "none" && (
        <div className="space-y-2">
          <div>
            <FieldLabel>السرعة (مدّة الدورة)</FieldLabel>
            <RangeInput
              value={bg.animation.speed}
              min={4}
              max={40}
              step={1}
              onChange={(v) => setBg((b) => void (b.animation.speed = v))}
              format={(v) => `${v}ث`}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>لون ١</FieldLabel>
              <ColorInput value={bg.animation.colorA} onChange={(v) => setBg((b) => void (b.animation.colorA = v))} />
            </div>
            <div>
              <FieldLabel>لون ٢</FieldLabel>
              <ColorInput value={bg.animation.colorB} onChange={(v) => setBg((b) => void (b.animation.colorB = v))} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ضوابط النص ──────────────────────────────────────────────────────────────

function TextControls({
  sectionKey,
  section,
  update,
}: {
  sectionKey: SectionKey;
  section: LandingConfig["sections"][SectionKey];
  update: (fn: (d: LandingConfig) => void) => void;
}) {
  const t = section.style.text;
  const setT = (fn: (x: LandingConfig["sections"][SectionKey]["style"]["text"]) => void) =>
    update((d) => fn(d.sections[sectionKey].style.text));

  const alignOptions = [
    { value: "auto" as const, label: "تلقائي" },
    { value: "right" as const, label: "يمين" },
    { value: "center" as const, label: "وسط" },
    { value: "left" as const, label: "يسار" },
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider pt-2">النص</h4>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>لون العناوين</FieldLabel>
          <ColorInput
            value={t.headingColor}
            onChange={(v) => setT((x) => void (x.headingColor = v))}
            onClear={() => setT((x) => void (x.headingColor = null))}
          />
        </div>
        <div>
          <FieldLabel>لون النص</FieldLabel>
          <ColorInput
            value={t.bodyColor}
            onChange={(v) => setT((x) => void (x.bodyColor = v))}
            onClear={() => setT((x) => void (x.bodyColor = null))}
          />
        </div>
      </div>
      <div>
        <FieldLabel>حجم العناوين</FieldLabel>
        <RangeInput
          value={t.headingScale}
          min={0.7}
          max={1.7}
          step={0.05}
          onChange={(v) => setT((x) => void (x.headingScale = v))}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      </div>
      <div>
        <FieldLabel>حجم النص</FieldLabel>
        <RangeInput
          value={t.bodyScale}
          min={0.7}
          max={1.7}
          step={0.05}
          onChange={(v) => setT((x) => void (x.bodyScale = v))}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      </div>
      <div>
        <FieldLabel>المحاذاة</FieldLabel>
        <SegButtons
          options={alignOptions}
          value={t.align ?? "auto"}
          onChange={(v) => setT((x) => void (x.align = v === "auto" ? null : v))}
        />
      </div>
    </div>
  );
}
