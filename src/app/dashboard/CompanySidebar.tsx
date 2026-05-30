"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import AddCharityModal from "./AddCharityModal";

export default function CompanySidebar({ charities }: { charities: { id: string; name: string }[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  // Auto-collapse sidebar on mobile screens on initial load
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsOpen(false);
    }
  }, []);

  const filteredCharities = charities.filter(c => c.name.includes(search));

  const sidebarContent = (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col h-full">
      {/* Sidebar Header with Close Button */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-lg">
            ز
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">زاد التنموية</h2>
            <p className="text-xs text-slate-400">لوحة تحكم الشركة</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer select-none active:scale-95"
          title="إغلاق القائمة"
        >
          ✕
        </button>
      </div>

      {/* Add Charity Button */}
      <div className="mb-6 shrink-0">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-primary text-white font-bold py-3 px-4 rounded-xl hover:bg-primary/95 transition-colors flex items-center justify-center gap-2 cursor-pointer select-none active:scale-[0.98]"
        >
          <span className="text-lg font-light">+</span> إضافة جمعية جديدة
        </button>
      </div>

      {/* Search Input */}
      <div className="mb-4 shrink-0">
        <input
          type="text"
          placeholder="البحث عن جمعية..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:bg-white text-slate-800 transition-all placeholder-slate-400"
        />
      </div>

      {/* Charity List */}
      <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-1 custom-scrollbar">
        <div className="text-[11px] font-bold text-slate-400 mb-3 px-2 uppercase tracking-wider">الجمعيات المتعاقد معها</div>
        {filteredCharities.length > 0 ? (
          filteredCharities.map((charity) => (
            <Link
              key={charity.id}
              href={`/dashboard/charity/${encodeURIComponent(charity.name)}`}
              className="block px-4 py-2.5 rounded-xl text-slate-600 hover:bg-primary/5 hover:text-primary font-bold transition-colors truncate text-sm"
              title={charity.name}
            >
              {charity.name}
            </Link>
          ))
        ) : (
          <div className="text-xs text-slate-400 text-center py-6">
            لا توجد نتائج مطابقة
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Floating Open Button (Only shows when sidebar is closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-24 right-4 z-40 bg-white border border-slate-200 text-slate-700 font-bold px-4 py-3 rounded-xl transition-all hover:bg-slate-50 active:scale-95 flex items-center gap-2 cursor-pointer select-none border-b-2"
          title="عرض القائمة الجانبية"
        >
          <span>☰</span>
          <span className="text-xs hidden sm:inline">القائمة الجانبية</span>
        </button>
      )}

      {/* Desktop Collapsible Sidebar (using width animation to push/pull content) */}
      <aside
        className={`transition-all duration-300 ease-in-out shrink-0 overflow-hidden hidden lg:block sticky top-8 h-[calc(100vh-6rem)] ${
          isOpen ? "w-72 lg:ml-8 opacity-100" : "w-0 lg:ml-0 opacity-0 pointer-events-none"
        }`}
      >
        <div className="w-72 h-full">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile/Tablet Sliding Drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${isOpen ? "visible" : "invisible pointer-events-none"}`}>
        {/* Backdrop overlay */}
        <div
          className={`absolute inset-0 bg-slate-950/20 backdrop-blur-xs transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsOpen(false)}
        />
        
        {/* Drawer content */}
        <div
          className={`absolute top-0 right-0 h-full w-72 max-w-[85vw] transform transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {sidebarContent}
        </div>
      </div>

      {isModalOpen && (
        <AddCharityModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => setIsModalOpen(false)} 
        />
      )}
    </>
  );
}
