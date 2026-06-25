"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Calendar,
  Folder,
  Building2,
  RotateCcw,
  Plus,
  Newspaper,
  CheckCircle2,
  AlertCircle,
  Trash2,
  X,
  Loader2,
  Filter,
  ChevronDown
} from "lucide-react";
import { createNewsAction, deleteNewsAction } from "@/app/actions/tasks";
import { addCategory, deleteCategory } from "@/app/actions/categories";

interface NewsItem {
  id: string;
  charityId: string;
  charityName: string;
  title: string;
  category: string;
  description: string;
  rawDate: string;
  date: string;
}

interface Charity {
  id: string;
  name: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "الاستراتيجية": "text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20",
  "التقنية": "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
  "تنمية الموارد": "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20",
  "تكليف": "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20",
  "استقطاب": "text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20",
};
const catColor = (cat: string) => CATEGORY_COLORS[cat] || "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20";

export default function NewsFilterClient({
  charities,
  initialNewsItems,
  session,
  categories: initialCategories,
}: {
  charities: Charity[];
  initialNewsItems: NewsItem[];
  session: any;
  categories: string[];
}) {
  const [newsItems, setNewsItems] = useState<NewsItem[]>(initialNewsItems);
  const [categories, setCategories] = useState<string[]>(initialCategories);

  useEffect(() => { setNewsItems(initialNewsItems); }, [initialNewsItems]);

  const [selectedCharity, setSelectedCharity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Form states
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [selectedCharityNames, setSelectedCharityNames] = useState<string[]>([]);
  const [newsCategory, setNewsCategory] = useState(initialCategories[0] || "الاستراتيجية");
  const [newsTitle, setNewsTitle] = useState("");
  const [newsDescription, setNewsDescription] = useState("");
  const [newsDate, setNewsDate] = useState("");

  // Category management
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSecretariatOrAdmin = ["ADMIN", "ADMINISTRATIVE_SECRETARIAT", "EXECUTIVE_DIRECTOR"].includes(session?.role);

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    setCatError(null);
    startTransition(async () => {
      const res = await addCategory(newCatName.trim());
      if (res.error) { setCatError(res.error); }
      else if (res.categories) {
        setCategories(res.categories);
        setNewsCategory(newCatName.trim());
        setNewCatName(""); setShowAddCat(false);
      }
    });
  };

  const handleDeleteCategory = (name: string) => {
    startTransition(async () => {
      const res = await deleteCategory(name);
      if (res.categories) {
        setCategories(res.categories);
        if (newsCategory === name) setNewsCategory(res.categories[0] || "");
      }
    });
  };

  const showNotification = (type: "success" | "error", message: string) => {
    if (type === "success") { setSuccessMsg(message); setErrorMsg(null); setTimeout(() => setSuccessMsg(null), 3000); }
    else { setErrorMsg(message); setSuccessMsg(null); setTimeout(() => setErrorMsg(null), 4000); }
  };

  const resetFilters = () => { setSelectedCharity("all"); setSelectedCategory("all"); setSelectedDate(""); };
  const hasFilters = selectedCharity !== "all" || selectedCategory !== "all" || selectedDate;

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCharityNames.length === 0 || !newsCategory || !newsTitle.trim()) return;
    startTransition(async () => {
      const res = await createNewsAction({
        charityName: selectedCharityNames.join(", "),
        category: newsCategory,
        title: newsTitle.trim(),
        description: newsDescription.trim() || undefined,
        date: newsDate || undefined,
      });
      if (res.error) { showNotification("error", res.error); }
      else if (res.success && res.newsItem) {
        const primaryCharity = charities.find(c => c.name.trim().toLowerCase() === selectedCharityNames[0].trim().toLowerCase());
        const newItem: NewsItem = {
          id: res.newsItem.id,
          charityId: primaryCharity?.id || "unknown",
          charityName: res.newsItem.charityName,
          title: res.newsItem.title,
          category: res.newsItem.category,
          description: res.newsItem.description || "",
          rawDate: res.newsItem.date instanceof Date ? res.newsItem.date.toISOString() : new Date(res.newsItem.date).toISOString(),
          date: new Date(res.newsItem.date).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" }),
        };
        setNewsItems(prev => [newItem, ...prev]);
        setNewsTitle(""); setNewsDescription(""); setNewsDate(""); setSelectedCharityNames([]);
        setShowNewsForm(false);
        showNotification("success", "تم نشر الخبر بنجاح");
      }
    });
  };

  const handleDeleteNews = async (newsId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا الخبر؟")) return;
    startTransition(async () => {
      const res = await deleteNewsAction(newsId);
      if (res.error) { showNotification("error", res.error); }
      else if (res.success) { setNewsItems(prev => prev.filter(i => i.id !== newsId)); showNotification("success", "تم حذف الخبر"); }
    });
  };

  const filteredNews = newsItems.filter(item => {
    if (selectedCharity !== "all") {
      const itemCharities = item.charityName.split(",").map(n => n.trim().toLowerCase());
      if (!itemCharities.includes(selectedCharity.trim().toLowerCase())) return false;
    }
    if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
    if (selectedDate) {
      const itemDate = new Date(item.rawDate).setHours(0, 0, 0, 0);
      const filterDate = new Date(selectedDate).setHours(0, 0, 0, 0);
      if (itemDate < filterDate) return false;
    }
    return true;
  });

  return (
    <main className="flex-1 min-w-0 py-6 relative" dir="rtl">
      {/* Notifications */}
      {successMsg && (
        <div className="fixed bottom-5 left-5 z-50 bg-emerald-500 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 font-bold text-sm">
          <CheckCircle2 className="w-4 h-4" />{successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-5 left-5 z-50 bg-red-500 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 font-bold text-sm">
          <AlertCircle className="w-4 h-4" />{errorMsg}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">الأخبار والإنجازات</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{filteredNews.length} خبر{hasFilters ? " (مفلتر)" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${hasFilters ? "bg-primary/10 text-primary border-primary/30" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}
          >
            <Filter className="w-3.5 h-3.5" />
            تصفية
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
          {isSecretariatOrAdmin && (
            <button
              onClick={() => setShowNewsForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              نشر خبر
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3" />الجمعية
              </label>
              <select
                value={selectedCharity}
                onChange={e => setSelectedCharity(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-100 font-bold cursor-pointer"
              >
                <option value="all">كل الجمعيات</option>
                <option value="إدارة زاد">إدارة زاد</option>
                <option value="عدة جمعيات">عدة جمعيات</option>
                {charities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                <Folder className="w-3 h-3" />القسم
              </label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-100 font-bold cursor-pointer"
              >
                <option value="all">كل الأقسام</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />منذ تاريخ
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-100 font-bold cursor-pointer"
              />
            </div>
          </div>
          {hasFilters && (
            <button onClick={resetFilters} className="mt-3 text-[11px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      )}

      {/* News List */}
      <div className="space-y-2">
        {filteredNews.map(item => {
          const itemCharitiesList = item.charityName.split(",").map(n => n.trim());
          const validCharities = itemCharitiesList.filter(name =>
            charities.some(c => c.name.trim().toLowerCase() === name.toLowerCase())
          );
          return (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-sm transition-all duration-200 px-4 py-3"
            >
              <div className="flex items-start gap-3">
                {/* Left column: badges + title + desc */}
                <div className="flex-1 min-w-0">
                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    {itemCharitiesList.map(cName => (
                      <span key={cName} className="text-[10px] font-bold text-primary bg-primary/8 px-2 py-0.5 rounded-md">
                        {cName}
                      </span>
                    ))}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${catColor(item.category)}`}>
                      {item.category}
                    </span>
                  </div>
                  {/* Title */}
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
                    {item.title}
                  </p>
                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  {/* Footer row */}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{item.date}
                    </span>
                    {validCharities.map(cName => (
                      <Link
                        key={cName}
                        href={`/charity/${encodeURIComponent(cName)}`}
                        className="text-primary hover:text-primary/70 font-bold transition-colors"
                      >
                        {validCharities.length > 1 ? cName : "صفحة الجمعية ←"}
                      </Link>
                    ))}
                  </div>
                </div>
                {/* Right: delete */}
                {isSecretariatOrAdmin && (
                  <button
                    onClick={() => handleDeleteNews(item.id)}
                    disabled={isPending}
                    className="shrink-0 p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredNews.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 p-12 text-center">
            <div className="text-3xl mb-3 opacity-30">📰</div>
            <p className="font-bold text-sm text-slate-600 dark:text-slate-300">لا توجد نتائج مطابقة</p>
            <p className="text-xs text-slate-400 mt-1">جرب تغيير خيارات التصفية.</p>
          </div>
        )}
      </div>

      {/* Modal: Add News Form */}
      {isSecretariatOrAdmin && showNewsForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowNewsForm(false)} />
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-2xl w-full max-w-md relative z-10 p-5 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700/50">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-amber-600" />نشر خبر أو إنجاز
              </h3>
              <button onClick={() => setShowNewsForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNews} className="space-y-4">
              {/* Charities */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">الجمعيات المعنية</label>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-900/50 max-h-36 overflow-y-auto space-y-1">
                  {["إدارة زاد", "عدة جمعيات", ...charities.map(ch => ch.name)].map(name => {
                    const isChecked = selectedCharityNames.includes(name);
                    return (
                      <label key={name} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => setSelectedCharityNames(prev => isChecked ? prev.filter(n => n !== name) : [...prev, name])}
                          className="rounded border-slate-300 dark:border-slate-600 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                        />
                        {name}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">القسم المعني</label>
                <div className="flex gap-2">
                  <select
                    value={newsCategory}
                    onChange={e => setNewsCategory(e.target.value)}
                    required
                    className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800 dark:text-slate-100 font-bold cursor-pointer"
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setShowAddCat(v => !v); setCatError(null); setNewCatName(""); }}
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {showAddCat && (
                  <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-xl space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddCategory())}
                        placeholder="اسم القسم..."
                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-500/30 text-slate-800 dark:text-slate-100"
                        autoFocus
                      />
                      <button type="button" onClick={handleAddCategory} disabled={isPending || !newCatName.trim()}
                        className="px-2.5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold disabled:opacity-60">
                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "إضافة"}
                      </button>
                    </div>
                    {catError && <p className="text-[11px] text-red-500 font-medium">{catError}</p>}
                    <div className="flex flex-wrap gap-1 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/40">
                      {categories.map(cat => (
                        <button key={cat} type="button" onClick={() => handleDeleteCategory(cat)} disabled={isPending}
                          className="flex items-center gap-0.5 px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] text-slate-500 dark:text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors">
                          {cat}<Trash2 className="w-2.5 h-2.5 opacity-50" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">العنوان</label>
                <input
                  type="text"
                  required
                  value={newsTitle}
                  onChange={e => setNewsTitle(e.target.value)}
                  placeholder="عنوان الخبر أو الإنجاز..."
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800 dark:text-slate-100 font-medium"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">الوصف (اختياري)</label>
                <textarea
                  value={newsDescription}
                  onChange={e => setNewsDescription(e.target.value)}
                  placeholder="تفاصيل إضافية..."
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800 dark:text-slate-100 font-medium resize-none"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">تاريخ الخبر (اختياري)</label>
                <input
                  type="date"
                  value={newsDate}
                  onChange={e => setNewsDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800 dark:text-slate-100 cursor-pointer"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <button type="button" onClick={() => { setShowNewsForm(false); setNewsTitle(""); setNewsDescription(""); setNewsDate(""); setSelectedCharityNames([]); }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 font-bold text-xs cursor-pointer">
                  إلغاء
                </button>
                <button type="submit" disabled={isPending || selectedCharityNames.length === 0 || !newsTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 font-bold text-xs flex items-center gap-1.5 disabled:opacity-75 disabled:cursor-not-allowed shadow-sm">
                  {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />جاري...</> : "نشر الخبر"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
