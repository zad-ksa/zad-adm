"use client";

import { useState, useTransition } from "react";
import {
  FileText, Plus, X, Lock, Globe, Eye, LayoutTemplate, Printer,
  Edit2, Trash2, Search, Filter, ArrowRight, Download, Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createMeeting, updateMeeting, deleteMeeting, insertAiTasksIfEmpty } from "@/app/actions/meetings";
import { handlePrint, handlePreview, downloadAllMeetingsZip } from "./utils/meetingPrint";
import MeetingCard from "./components/MeetingCard";
import MeetingFormModal from "./components/MeetingFormModal";

export type MeetingTask = {
  id: string;
  title: string;
  assignedToId: string | null;
  assignedTo: { id: string; name: string } | null;
  dueDays: number | null;
  isDone: boolean;
};

export type Meeting = {
  id: string;
  title: string;
  date: string | Date;
  location: string | null;
  charityId: string | null;
  meetingContext: string | null;
  rawNotes: string;
  formattedContent: string;
  summary: string | null;
  attendees: string | null;
  isPrivate: boolean;
  createdById: string;
  createdBy: { id: string; name: string; role: string };
  charity: { name: string } | null;
  meetingTasks: MeetingTask[];
};

export type Charity = { id: string; name: string };
export type Employee = { id: string; name: string; role: string };

type Props = {
  meetings: Meeting[];
  charities: Charity[];
  employees: Employee[];
  sessionId: string;
  sessionRole: string;
  isTier1: boolean;
};

const DEPARTMENTS = [
  { value: "التخطيط الاستراتيجي", label: "التخطيط الاستراتيجي" },
  { value: "الحوكمة", label: "الحوكمة" },
  { value: "تنمية الموارد المالية", label: "تنمية الموارد المالية" },
  { value: "الإعلامية", label: "الإعلامية" },
  { value: "التقنية", label: "التقنية" },
  { value: "المالية", label: "المالية" },
  { value: "التسويق", label: "التسويق" },
  { value: "خدمات المشاريع", label: "خدمات المشاريع" },
  { value: "الإدارية", label: "الإدارية" },
  { value: "الإسناد الحكومي", label: "الإسناد الحكومي" },
];

const CATEGORY_CARDS = [
  { key: "all",                   label: "الكل",                   border: "border-slate-200 dark:border-slate-700",   text: "text-slate-600 dark:text-slate-300",   num: "text-slate-700 dark:text-slate-100" },
  { key: "زاد",                   label: "إدارة زاد",               border: "border-primary/30",                          text: "text-primary dark:text-primary-foreground/80",     num: "text-primary dark:text-primary-foreground" },
  { key: "التخطيط الاستراتيجي",   label: "التخطيط الاستراتيجي",    border: "border-indigo-500/30",                        text: "text-indigo-600 dark:text-indigo-400", num: "text-indigo-700 dark:text-indigo-300" },
  { key: "الحوكمة",               label: "الحوكمة",                 border: "border-violet-500/30",                        text: "text-violet-600 dark:text-violet-400", num: "text-violet-700 dark:text-violet-300" },
  { key: "تنمية الموارد المالية", label: "تنمية الموارد المالية",   border: "border-emerald-500/30",                       text: "text-emerald-600 dark:text-emerald-400", num: "text-emerald-700 dark:text-emerald-300" },
  { key: "الإعلامية",             label: "الإعلامية",               border: "border-pink-500/30",                          text: "text-pink-600 dark:text-pink-400",     num: "text-pink-700 dark:text-pink-300" },
  { key: "التقنية",               label: "التقنية",                 border: "border-cyan-500/30",                          text: "text-cyan-600 dark:text-cyan-400",     num: "text-cyan-700 dark:text-cyan-300" },
  { key: "المالية",               label: "المالية",                 border: "border-amber-500/30",                         text: "text-amber-600 dark:text-amber-400",   num: "text-amber-700 dark:text-amber-300" },
  { key: "التسويق",               label: "التسويق",                 border: "border-orange-500/30",                        text: "text-orange-600 dark:text-orange-400", num: "text-orange-700 dark:text-orange-300" },
  { key: "خدمات المشاريع",        label: "خدمات المشاريع",          border: "border-teal-500/30",                          text: "text-teal-600 dark:text-teal-400",     num: "text-teal-700 dark:text-teal-300" },
  { key: "الإدارية",              label: "الإدارية",                border: "border-rose-500/30",                          text: "text-rose-600 dark:text-rose-400",     num: "text-rose-700 dark:text-rose-300" },
  { key: "الإسناد الحكومي",       label: "الإسناد الحكومي",         border: "border-sky-500/30",                           text: "text-sky-600 dark:text-sky-400",       num: "text-sky-700 dark:text-sky-300" },
];

function getCategoryCount(meetings: Meeting[], key: string): number {
  if (key === "all") return meetings.length;
  if (key === "زاد") return meetings.filter(m => m.meetingContext === "إدارة زاد").length;
  return meetings.filter(m => m.meetingContext === key).length;
}

function CategorySelector({ meetings, onSelect }: { meetings: Meeting[]; onSelect: (key: string) => void }) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">محاضر الاجتماعات</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">اختر القسم للعرض</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {CATEGORY_CARDS.map(cat => {
          const count = getCategoryCount(meetings, cat.key);
          return (
            <button
              key={cat.key}
              onClick={() => onSelect(cat.key)}
              className={`bg-white dark:bg-slate-800 border ${cat.border} rounded-xl p-4 text-right hover:shadow-md transition-all active:scale-95 flex flex-col gap-2`}
            >
              <span className={`text-2xl font-black tabular-nums ${cat.num}`}>{count}</span>
              <div className="flex items-center justify-between gap-1">
                <span className={`text-xs font-semibold leading-snug ${cat.text}`}>{cat.label}</span>
                <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${cat.text}`} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MeetingsClient({ meetings, charities, employees, sessionId, sessionRole, isTier1 }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);

  // Form edit initial data
  const [formInitialData, setFormInitialData] = useState<any>(undefined);

  // ── تصفيات ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterContext, setFilterContext] = useState(""); 
  const [filterCharityId, setFilterCharityId] = useState(""); 
  const [filterPrivacy, setFilterPrivacy] = useState<"" | "private" | "public">("");
  const [filterPeriod, setFilterPeriod] = useState<"" | "today" | "week" | "month" | "quarter" | "year">("");

  const filteredMeetings = meetings.filter(m => {
    if (selectedCategory && selectedCategory !== "all") {
      if (selectedCategory === "زاد") {
        if (m.meetingContext !== "إدارة زاد") return false;
      } else {
        if (m.meetingContext !== selectedCategory) return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (
        !m.title.toLowerCase().includes(q) &&
        !m.createdBy.name.toLowerCase().includes(q) &&
        !(m.location || "").toLowerCase().includes(q)
      ) return false;
    }
    if (filterContext === "ctx:زاد") {
      if (m.meetingContext !== "إدارة زاد") return false;
    } else if (filterContext.startsWith("ctx:service:")) {
      const svcName = filterContext.slice("ctx:service:".length);
      if (m.meetingContext !== svcName) return false;
    }
    if (filterCharityId && m.charityId !== filterCharityId) return false;
    if (filterPrivacy === "private" && !m.isPrivate) return false;
    if (filterPrivacy === "public" && m.isPrivate) return false;
    if (filterPeriod) {
      const now = new Date();
      const mDate = new Date(m.date);
      if (filterPeriod === "today") {
        if (mDate.toDateString() !== now.toDateString()) return false;
      } else if (filterPeriod === "week") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        if (mDate < startOfWeek || mDate > now) return false;
      } else if (filterPeriod === "month") {
        if (mDate.getFullYear() !== now.getFullYear() || mDate.getMonth() !== now.getMonth()) return false;
      } else if (filterPeriod === "quarter") {
        const q = Math.floor(now.getMonth() / 3);
        const mq = Math.floor(mDate.getMonth() / 3);
        if (mDate.getFullYear() !== now.getFullYear() || mq !== q) return false;
      } else if (filterPeriod === "year") {
        if (mDate.getFullYear() !== now.getFullYear()) return false;
      }
    }
    return true;
  });

  const sortedByDate = [...meetings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const meetingNumberMap = new Map<string, number>(sortedByDate.map((m, i) => [m.id, i + 1]));

  const activeFilters = [searchQuery, filterContext, filterCharityId, filterPrivacy, filterPeriod].filter(Boolean).length;

  function resetFilters() {
    setSearchQuery(""); setFilterContext(""); setFilterCharityId(""); setFilterPrivacy(""); setFilterPeriod("");
  }

  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  async function handleDownloadAll() {
    if (meetings.length === 0 || isDownloadingAll) return;
    setIsDownloadingAll(true);
    try {
      await downloadAllMeetingsZip(meetings, meetingNumberMap);
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء تجهيز ملف التحميل. حاول مرة أخرى.");
    } finally {
      setIsDownloadingAll(false);
    }
  }

  function openCreate() {
    setFormInitialData(undefined);
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(m: Meeting) {
    setFormInitialData({
      title: m.title,
      date: new Date(m.date).toISOString().slice(0, 10),
      location: m.location || "",
      attendees: m.attendees || "",
      rawNotes: m.rawNotes,
      charityId: m.charityId || "",
      meetingContext: m.meetingContext ? (m.meetingContext === "إدارة زاد" ? "زاد" : `service:${m.meetingContext}`) : "",
      isPrivate: m.isPrivate,
      formattedContent: m.formattedContent
    });
    setEditingId(m.id);
    setShowModal(true);
  }

  async function handleSave(data: {
    title: string;
    date: string;
    location: string;
    charityId: string;
    attendees: string;
    rawNotes: string;
    meetingContext: string;
    isPrivate: boolean;
    formattedContent: string;
  }) {
    let resolvedCharityId = data.charityId || "";
    let resolvedContext = "";
    if (data.meetingContext.startsWith("service:")) {
      resolvedContext = data.meetingContext.slice("service:".length);
    } else if (data.meetingContext === "زاد") {
      resolvedContext = "إدارة زاد";
    }

    startTransition(async () => {
      let savedId = editingId;
      if (editingId) {
        await updateMeeting(editingId, {
          title: data.title, date: data.date, location: data.location || null,
          charityId: resolvedCharityId || null,
          meetingContext: resolvedContext || null,
          attendees: data.attendees || null,
          rawNotes: data.rawNotes, formattedContent: data.formattedContent, isPrivate: data.isPrivate,
        });
      } else {
        const res = await createMeeting({
          title: data.title, date: data.date, location: data.location,
          charityId: resolvedCharityId, meetingContext: resolvedContext,
          rawNotes: data.rawNotes, formattedContent: data.formattedContent,
          attendees: data.attendees, isPrivate: data.isPrivate
        });
        savedId = res.id;
      }
      setShowModal(false);
      
      if (savedId) {
        fetch("/api/meetings/extract-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formattedContent: data.formattedContent }),
        }).then(r => r.json()).then(async result => {
          try {
            await updateMeeting(savedId!, { summary: result.summary || "" });
            if (result.tasks?.length > 0) {
              await insertAiTasksIfEmpty(savedId!, result.tasks as { title: string }[]);
            }
          } catch {}
        }).catch(() => {}).finally(() => { router.refresh(); });
      } else {
        router.refresh();
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("هل تريد حذف هذا المحضر؟")) return;
    startTransition(async () => {
      try {
        await deleteMeeting(id);
        router.refresh();
      }
      catch (e: any) { alert(e.message); }
    });
  }

  function formatDate(d: string | Date) {
    const dt = new Date(d);
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    return `${year}-${month}-${day}`;
  }

  if (selectedCategory === null) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end mb-3">
          {meetings.length > 0 && (
            <button
              onClick={handleDownloadAll}
              disabled={isDownloadingAll}
              className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary/30 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              title="تحميل جميع المحاضر مضغوطة، مقسّمة في مجلدات حسب الخدمة"
            >
              {isDownloadingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {isDownloadingAll ? "جاري التجهيز..." : "تحميل جميع المحاضر"}
            </button>
          )}
        </div>
        <CategorySelector meetings={meetings} onSelect={setSelectedCategory} />
        {showModal && (
          <MeetingFormModal
            editingId={editingId}
            charities={charities}
            departments={DEPARTMENTS}
            isTier1={isTier1}
            initialData={formInitialData}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
          />
        )}

        {/* Floating Action Button */}
        <button 
          onClick={openCreate}
          className="fixed bottom-6 left-6 lg:bottom-8 lg:left-8 z-40 flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-3.5 rounded-full shadow-lg shadow-primary/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/40 font-bold"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm">محضر جديد</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
            title="رجوع"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {selectedCategory === "all" ? "كل المحاضر" : selectedCategory === "زاد" ? "إدارة زاد" : selectedCategory}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{meetings.length} محضر</p>
          </div>
        </div>
        {meetings.length > 0 && (
          <button
            onClick={handleDownloadAll}
            disabled={isDownloadingAll}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary/30 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
            title="تحميل جميع المحاضر مضغوطة، مقسّمة في مجلدات حسب الخدمة"
          >
            {isDownloadingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {isDownloadingAll ? "جاري التجهيز..." : "تحميل الكل"}
          </button>
        )}
      </div>

      {/* شريط التصفية */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-3 space-y-2">
        {/* بحث */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث في عنوان المحضر أو المنشئ أو المكان..."
            className="w-full border border-slate-200 dark:border-slate-700 rounded-lg pr-9 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* صف الفلاتر */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />

          {/* نوع / سياق الاجتماع */}
          <select
            value={filterContext}
            onChange={e => setFilterContext(e.target.value)}
            className={`border rounded-lg px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary transition-colors ${filterContext ? "border-primary/50 text-primary bg-primary/5" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"}`}
          >
            <option value="">كل الأنواع</option>
            <option value="ctx:زاد">إدارة زاد</option>
            <option disabled>── الأقسام ──</option>
            {DEPARTMENTS.map(d => <option key={d.value} value={`ctx:service:${d.value}`}>{d.label}</option>)}
          </select>

          {/* الجمعية */}
          {charities.length > 0 && (
            <select
              value={filterCharityId}
              onChange={e => setFilterCharityId(e.target.value)}
              className={`border rounded-lg px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary transition-colors ${filterCharityId ? "border-primary/50 text-primary bg-primary/5" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"}`}
            >
              <option value="">كل الجمعيات</option>
              {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {/* الخصوصية */}
          <select
            value={filterPrivacy}
            onChange={e => setFilterPrivacy(e.target.value as any)}
            className={`border rounded-lg px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary transition-colors ${filterPrivacy ? "border-primary/50 text-primary bg-primary/5" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"}`}
          >
            <option value="">عام وخاص</option>
            <option value="public">عام فقط</option>
            <option value="private">خاص فقط</option>
          </select>

          {/* عدد النتائج + مسح */}
          <div className="flex items-center gap-1.5 mr-auto">
            <span className="text-[11px] text-slate-400">{filteredMeetings.length} من {meetings.length}</span>
            {activeFilters > 0 && (
              <button onClick={resetFilters} className="flex items-center gap-1 text-[11px] font-bold text-red-400 hover:text-red-600 transition-colors">
                <X className="w-3.5 h-3.5" /> مسح
              </button>
            )}
          </div>
        </div>

        {/* تصفية التاريخ */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-700/50">
          <span className="text-[10px] font-bold text-slate-400 shrink-0">الفترة:</span>
          {([
            { value: "", label: "الكل" },
            { value: "today", label: "اليوم" },
            { value: "week", label: "هذا الأسبوع" },
            { value: "month", label: "هذا الشهر" },
            { value: "quarter", label: "هذا الربع" },
            { value: "year", label: "هذه السنة" },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterPeriod(opt.value)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-colors ${
                filterPeriod === opt.value
                  ? "bg-primary text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {meetings.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-16 text-center">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">لا توجد محاضر بعد</p>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-10 text-center">
          <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">لا توجد محاضر تطابق التصفية الحالية</p>
          <button onClick={resetFilters} className="mt-2 text-xs text-primary hover:underline">مسح التصفية</button>
        </div>
      ) : (
        <div className="grid gap-1">
          {filteredMeetings.map(m => (
            <MeetingCard
              key={m.id}
              meeting={m}
              meetingNumber={meetingNumberMap.get(m.id) ?? 0}
              sessionId={sessionId}
              isTier1={isTier1}
              employees={employees}
              departments={DEPARTMENTS}
              onView={setViewingMeeting}
              onEdit={openEdit}
              onDelete={handleDelete}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {/* View Modal */}
      {viewingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h2 className="font-bold text-slate-800 dark:text-slate-100 text-xs">{viewingMeeting.title}</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(viewingMeeting.date)}{viewingMeeting.location ? ` · ${viewingMeeting.location}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePreview(viewingMeeting, meetingNumberMap.get(viewingMeeting.id))} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition-colors" title="عرض بالكليشة">
                  <LayoutTemplate className="w-4 h-4" />
                </button>
                <button onClick={() => handlePrint(viewingMeeting, meetingNumberMap.get(viewingMeeting.id))} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition-colors" title="طباعة">
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => setViewingMeeting(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-700 dark:text-slate-200 text-right" dir="rtl">
                {viewingMeeting.formattedContent}
              </pre>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <MeetingFormModal
          editingId={editingId}
          charities={charities}
          departments={DEPARTMENTS}
          isTier1={isTier1}
          initialData={formInitialData}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {/* Floating Action Button */}
      <button 
        onClick={openCreate}
        className="fixed bottom-6 left-6 lg:bottom-8 lg:left-8 z-40 flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-3.5 rounded-full shadow-lg shadow-primary/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/40 font-bold"
      >
        <Plus className="w-5 h-5" />
        <span className="text-sm">محضر جديد</span>
      </button>
    </div>
  );
}
