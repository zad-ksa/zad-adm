"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
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
  X
} from "lucide-react";
import { createNewsAction, deleteNewsAction } from "@/app/actions/tasks";

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

export default function NewsFilterClient({
  charities,
  initialNewsItems,
  session,
}: {
  charities: Charity[];
  initialNewsItems: NewsItem[];
  session: any;
}) {
  const [newsItems, setNewsItems] = useState<NewsItem[]>(initialNewsItems);
  
  // Sync news items when parent updates
  useEffect(() => {
    setNewsItems(initialNewsItems);
  }, [initialNewsItems]);

  const [selectedCharity, setSelectedCharity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");

  const uniqueCategories = useMemo(() => {
    const defaultCats = ["الاستراتيجية", "التقنية", "تنمية الموارد", "الإعلامية", "تكليف", "استقطاب"];
    const cats = new Set<string>(defaultCats);
    newsItems.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [newsItems]);

  // Form states (supporting multiple selected charities)
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [selectedCharityNames, setSelectedCharityNames] = useState<string[]>([]);
  const [newsCategory, setNewsCategory] = useState("الاستراتيجية");
  const [newsTitle, setNewsTitle] = useState("");
  const [newsDescription, setNewsDescription] = useState("");
  const [newsDate, setNewsDate] = useState("");

  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSecretariatOrAdmin = ["ADMIN", "ADMINISTRATIVE_SECRETARIAT"].includes(session?.role);

  const showNotification = (type: "success" | "error", message: string) => {
    if (type === "success") {
      setSuccessMsg(message);
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(message);
      setSuccessMsg(null);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const resetFilters = () => {
    setSelectedCharity("all");
    setSelectedCategory("all");
    setSelectedDate("");
  };

  // Handle news/achievement creation
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

      if (res.error) {
        showNotification("error", res.error);
      } else if (res.success && res.newsItem) {
        const primaryCharity = charities.find(
          (c) => c.name.trim().toLowerCase() === selectedCharityNames[0].trim().toLowerCase()
        );
        const newItem: NewsItem = {
          id: res.newsItem.id,
          charityId: primaryCharity?.id || "unknown",
          charityName: res.newsItem.charityName,
          title: res.newsItem.title,
          category: res.newsItem.category,
          description: res.newsItem.description || "",
          rawDate: res.newsItem.date instanceof Date 
            ? res.newsItem.date.toISOString() 
            : new Date(res.newsItem.date).toISOString(),
          date: new Date(res.newsItem.date).toLocaleDateString("ar-SA", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        };

        setNewsItems((prev) => [newItem, ...prev]);
        setNewsTitle("");
        setNewsDescription("");
        setNewsDate("");
        setSelectedCharityNames([]);
        setShowNewsForm(false);
        showNotification("success", "تم نشر الخبر أو الإنجاز بنجاح");
      }
    });
  };

  // Handle news deletion
  const handleDeleteNews = async (newsId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا الخبر؟")) return;

    startTransition(async () => {
      const res = await deleteNewsAction(newsId);
      if (res.error) {
        showNotification("error", res.error);
      } else if (res.success) {
        setNewsItems((prev) => prev.filter((item) => item.id !== newsId));
        showNotification("success", "تم حذف الخبر بنجاح");
      }
    });
  };

  const filteredNews = newsItems.filter((item) => {
    // 1. Charity Filter (matches if selected charity is one of the news item's charities)
    if (selectedCharity !== "all") {
      const itemCharities = item.charityName.split(",").map(name => name.trim().toLowerCase());
      if (!itemCharities.includes(selectedCharity.trim().toLowerCase())) {
        return false;
      }
    }
    
    // 2. Category Filter
    if (selectedCategory !== "all" && item.category !== selectedCategory) {
      return false;
    }
    
    // 3. Date Filter
    if (selectedDate) {
      const itemDate = new Date(item.rawDate).setHours(0, 0, 0, 0);
      const filterDate = new Date(selectedDate).setHours(0, 0, 0, 0);
      if (itemDate < filterDate) {
        return false;
      }
    }
    
    return true;
  });

  return (
    <main className="flex-1 min-w-0 py-8 relative" dir="rtl">
      {/* Notifications */}
      {successMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-500 dark:bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in font-bold text-sm">
          <CheckCircle2 className="w-5 h-5" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-red-500 dark:bg-red-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in font-bold text-sm">
          <AlertCircle className="w-5 h-5" />
          {errorMsg}
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">الأخبار والإنجازات</h1>
        <p className="text-slate-600 dark:text-slate-300 font-medium">تصفية واستعراض كافة الإنجازات والتقارير الإخبارية للجمعيات المتعاقد معها</p>
      </div>

      <div className="flex flex-col gap-8">
        {/* News Feed Content */}
        <div className="space-y-8">
          
          {/* Filters Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800/60 dark:border-slate-800/60">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <span className="w-2 h-4.5 bg-primary rounded-full"></span>
                أدوات التصفية والبحث
              </h3>
              
              {(selectedCharity !== "all" || selectedCategory !== "all" || selectedDate) && (
                <button
                  onClick={resetFilters}
                  className="text-xs font-bold text-red-500 hover:text-red-650 flex items-center gap-1.5 transition-colors cursor-pointer select-none"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  إعادة ضبط الفلاتر
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Charity Filter */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  تصفية حسب الجمعية
                </label>
                <select
                  value={selectedCharity}
                  onChange={(e) => setSelectedCharity(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white dark:focus:bg-slate-800 dark:bg-slate-800 dark:focus:bg-slate-800 dark:bg-slate-800 text-slate-800 dark:text-slate-100 transition-all font-bold cursor-pointer"
                >
                  <option value="all">كل الجمعيات</option>
                  <option value="إدارة زاد">إدارة زاد</option>
                  <option value="عدة جمعيات">عدة جمعيات</option>
                  {charities.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-slate-400" />
                  تصفية حسب القسم
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white dark:focus:bg-slate-800 dark:bg-slate-800 dark:focus:bg-slate-800 dark:bg-slate-800 text-slate-800 dark:text-slate-100 transition-all font-bold cursor-pointer"
                >
                  <option value="all">كل الأقسام</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  البدء من تاريخ (منذ تاريخ)
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white dark:focus:bg-slate-800 dark:bg-slate-800 dark:focus:bg-slate-800 dark:bg-slate-800 text-slate-800 dark:text-slate-100 transition-all font-bold cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">الأخبار والتقارير ({filteredNews.length})</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredNews.map((item) => {
                // Parse charities and identify valid DB charity records to generate direct links
                const itemCharitiesList = item.charityName.split(",").map(n => n.trim());
                const validCharities = itemCharitiesList.filter(name =>
                  charities.some(c => c.name.trim().toLowerCase() === name.toLowerCase())
                );

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Badges & Delete Action */}
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {itemCharitiesList.map((cName) => (
                            <span key={cName} className="inline-block text-[10px] font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-md">
                              {cName}
                            </span>
                          ))}
                          <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-md ${
                            item.category === "الاستراتيجية" ? "text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20" :
                            item.category === "التقنية" ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" :
                            item.category === "تنمية الموارد" ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20" :
                            item.category === "تكليف" ? "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20" :
                            item.category === "استقطاب" ? "text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20" :
                            "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20" // الإعلامية
                          }`}>
                            {item.category}
                          </span>
                        </div>

                        {/* Delete Button (Secretariat & Admin only) */}
                        {isSecretariatOrAdmin && (
                          <button
                            onClick={() => handleDeleteNews(item.id)}
                            disabled={isPending}
                            title="حذف الخبر"
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-colors cursor-pointer select-none shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* News Title */}
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-2 group-hover:text-primary transition-colors duration-300">
                        {item.title}
                      </h4>

                      {/* Description */}
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6">
                        {item.description}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-50 dark:border-slate-800/60 text-[11px] font-bold text-slate-400">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Calendar className="w-3.5 h-3.5" />
                        {item.date}
                      </div>
                      
                      <div className="flex flex-wrap gap-3">
                        {validCharities.map((cName) => (
                          <Link
                            key={cName}
                            href={`/charity/${encodeURIComponent(cName)}`}
                            className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1 text-[11px]"
                          >
                            {validCharities.length > 1 ? cName : "صفحة الجمعية"}
                            <svg className="w-3 h-3 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredNews.length === 0 && (
                <div className="col-span-full bg-white dark:bg-slate-800 rounded-2xl p-16 text-center text-slate-400 border border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 shadow-sm">
                  <div className="text-4xl mb-4 opacity-40">📰</div>
                  <p className="font-bold text-base text-slate-700 dark:text-slate-200 mb-1">لا توجد نتائج مطابقة</p>
                  <p className="text-xs text-slate-400 font-medium">جرب تغيير خيارات التصفية أو إعادة ضبط الفلاتر.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Action Button (FAB) */}
        {isSecretariatOrAdmin && !showNewsForm && (
          <button
            onClick={() => setShowNewsForm(true)}
            title="نشر خبر أو إنجاز جديد"
            className="fixed bottom-8 left-8 z-40 bg-amber-600 hover:bg-amber-700 text-white w-14 h-14 rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center cursor-pointer"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        {/* Modal: Add News Form */}
        {isSecretariatOrAdmin && showNewsForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-md transition-opacity duration-300"
              onClick={() => setShowNewsForm(false)}
            />
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 shadow-2xl w-full max-w-lg overflow-hidden relative z-10 transform transition-all duration-300 scale-100 p-6 md:p-8 max-h-[90vh] overflow-y-auto" dir="rtl">
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Newspaper className="w-6 h-6 text-amber-600" />
                    نشر خبر أو إنجاز جديد
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-1.5">
                    يمكنك تحديد جمعية أو أكثر ليظهر مباشرة كأوسمة فوق الخبر.
                  </p>
                </div>
                <button
                  onClick={() => setShowNewsForm(false)}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateNews} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">الجمعيات المعنية (اختر جمعية أو أكثر)</label>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-900/50 max-h-40 overflow-y-auto space-y-2 focus-within:ring-4 focus-within:ring-amber-500/10 focus-within:border-amber-500/30 transition-all">
                    {[
                      "إدارة زاد",
                      "عدة جمعيات",
                      ...charities.map((ch) => ch.name)
                    ].map((name) => {
                      const isChecked = selectedCharityNames.includes(name);
                      return (
                        <label key={name} className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none py-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedCharityNames(prev => prev.filter(n => n !== name));
                              } else {
                                setSelectedCharityNames(prev => [...prev, name]);
                              }
                            }}
                            className="rounded border-slate-300 dark:border-slate-600 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                          />
                          {name}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">القسم المعني</label>
                  <input
                    type="text"
                    list="news-categories"
                    value={newsCategory}
                    onChange={(e) => setNewsCategory(e.target.value)}
                    required
                    placeholder="اختر أو اكتب القسم المعني..."
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/30 text-slate-800 dark:text-slate-100 transition-all font-bold"
                  />
                  <datalist id="news-categories">
                    <option value="الاستراتيجية" />
                    <option value="التقنية" />
                    <option value="تنمية الموارد" />
                    <option value="الإعلامية" />
                    <option value="تكليف" />
                    <option value="استقطاب" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">العنوان</label>
                  <input
                    type="text"
                    required
                    value={newsTitle}
                    onChange={(e) => setNewsTitle(e.target.value)}
                    placeholder="عنوان الخبر أو الإنجاز..."
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/30 text-slate-800 dark:text-slate-100 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">الوصف (اختياري)</label>
                  <textarea
                    value={newsDescription}
                    onChange={(e) => setNewsDescription(e.target.value)}
                    placeholder="تفاصيل إضافية عن الخبر..."
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/30 text-slate-800 dark:text-slate-100 transition-all font-medium resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">تاريخ الخبر (اختياري)</label>
                  <input
                    type="date"
                    value={newsDate}
                    onChange={(e) => setNewsDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/30 text-slate-800 dark:text-slate-100 transition-all font-medium cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5 font-bold">في حال تركه فارغاً، سيتم اعتماد تاريخ اليوم كافتراضي.</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewsForm(false);
                      setNewsTitle("");
                      setNewsDescription("");
                      setNewsDate("");
                      setSelectedCharityNames([]);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:text-slate-200 font-bold transition-all text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || selectedCharityNames.length === 0 || !newsTitle.trim()}
                    className="px-6 py-2.5 rounded-xl bg-amber-600 text-white hover:bg-amber-700 font-bold transition-all text-xs flex items-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-sm hover:shadow"
                  >
                    {isPending ? "جاري النشر..." : "نشر الخبر الآن"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
