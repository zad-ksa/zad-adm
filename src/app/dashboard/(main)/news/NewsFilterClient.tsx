"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Folder, Building2, RotateCcw } from "lucide-react";

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
}: {
  charities: Charity[];
  initialNewsItems: NewsItem[];
}) {
  const [selectedCharity, setSelectedCharity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");

  const resetFilters = () => {
    setSelectedCharity("all");
    setSelectedCategory("all");
    setSelectedDate("");
  };

  const filteredNews = initialNewsItems.filter((item) => {
    // 1. Charity Filter
    if (selectedCharity !== "all" && item.charityName !== selectedCharity) {
      return false;
    }
    
    // 2. Category Filter
    if (selectedCategory !== "all" && item.category !== selectedCategory) {
      return false;
    }
    
    // 3. Date Filter (matches items on or after selected date)
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
    <main className="flex-1 min-w-0 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">الأخبار والإنجازات</h1>
        <p className="text-slate-600 font-medium">تصفية واستعراض كافة الإنجازات والتقارير الإخبارية للجمعيات المتعاقد معها</p>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-50">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
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
            <label className="block text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              تصفية حسب الجمعية
            </label>
            <select
              value={selectedCharity}
              onChange={(e) => setSelectedCharity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white text-slate-805 transition-all font-bold cursor-pointer"
            >
              <option value="all">كل الجمعيات</option>
              {charities.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-slate-400" />
              تصفية حسب القسم
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white text-slate-805 transition-all font-bold cursor-pointer"
            >
              <option value="all">كل الأقسام</option>
              <option value="الاستراتيجية">الاستراتيجية</option>
              <option value="التقنية">التقنية</option>
              <option value="تنمية الموارد">تنمية الموارد</option>
              <option value="الإعلامية">الإعلامية</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              البدء من تاريخ (منذ تاريخ)
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white text-slate-805 transition-all font-bold cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-lg">الأخبار والتقارير ({filteredNews.length})</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredNews.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="inline-block text-[10px] font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-md">
                    {item.charityName}
                  </span>
                  <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-md ${
                    item.category === "الاستراتيجية" ? "text-violet-700 bg-violet-50" :
                    item.category === "التقنية" ? "text-blue-700 bg-blue-50" :
                    item.category === "تنمية الموارد" ? "text-emerald-700 bg-emerald-50" :
                    "text-amber-700 bg-amber-50" // الإعلامية
                  }`}>
                    {item.category}
                  </span>
                </div>

                {/* News Title */}
                <h4 className="font-bold text-slate-800 text-base mb-2 group-hover:text-primary transition-colors duration-300">
                  {item.title}
                </h4>

                {/* Description */}
                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                  {item.description}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-50 text-[11px] font-bold text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {item.date}
                </div>
                
                <Link
                  href={`/dashboard/charity/${encodeURIComponent(item.charityName)}`}
                  className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  صفحة الجمعية
                  <svg className="w-3 h-3 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}

          {filteredNews.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl p-16 text-center text-slate-400 border border-slate-100 shadow-sm">
              <div className="text-4xl mb-4 opacity-40">📰</div>
              <p className="font-bold text-base text-slate-700 mb-1">لا توجد نتائج مطابقة</p>
              <p className="text-xs text-slate-400 font-medium">جرب تغيير خيارات التصفية أو إعادة ضبط الفلاتر.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
