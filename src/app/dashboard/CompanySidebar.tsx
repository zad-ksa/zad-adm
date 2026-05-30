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
    <div className="bg-white p-6 flex flex-col h-full border-l border-slate-200">
      {/* Sidebar Header with Close Button */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-lg">
            ز
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">زاد التنموية</h2>
            <p className="text-[11px] text-slate-500 font-medium">لوحة تحكم الشركة</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer select-none active:scale-95"
          title="إغلاق القائمة"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* Add Charity Button */}
      <div className="mb-6 shrink-0">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-primary/5 text-primary border border-primary/10 font-bold py-2.5 px-4 rounded-xl hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 cursor-pointer select-none active:scale-[0.98] text-sm"
        >
          <span className="text-lg font-light leading-none">+</span> إضافة جمعية جديدة
        </button>
      </div>

      {/* Search Input */}
      <div className="mb-6 shrink-0 relative">
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <input
          type="text"
          placeholder="البحث عن جمعية..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-50 border-none rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-slate-800 transition-all placeholder-slate-400 font-medium"
        />
      </div>

      {/* Charity List */}
      <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-1 custom-scrollbar">
        <div className="text-[10px] font-bold text-slate-400 mb-3 px-2 uppercase tracking-wider">الجمعيات المتعاقد معها</div>
        {filteredCharities.length > 0 ? (
          filteredCharities.map((charity) => (
            <Link
              key={charity.id}
              href={`/dashboard/charity/${encodeURIComponent(charity.name)}`}
              className="block px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-primary font-semibold transition-colors truncate text-sm"
              title={charity.name}
            >
              {charity.name}
            </Link>
          ))
        ) : (
          <div className="text-xs text-slate-400 text-center py-8 font-medium">
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
          className="fixed top-24 right-0 z-40 bg-white border border-r-0 border-slate-200 text-slate-700 font-bold px-4 py-3 rounded-l-xl transition-all hover:bg-slate-50 active:scale-95 flex items-center gap-2 cursor-pointer select-none shadow-sm"
          title="عرض القائمة الجانبية"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      )}

      {/* Desktop Collapsible Sidebar (using width animation to push/pull content) */}
      <aside
        className={`transition-all duration-300 ease-in-out shrink-0 overflow-hidden hidden lg:block sticky top-20 h-[calc(100vh-5rem)] bg-white ${
          isOpen ? "w-72 opacity-100" : "w-0 opacity-0 pointer-events-none"
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
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsOpen(false)}
        />
        
        {/* Drawer content */}
        <div
          className={`absolute top-0 right-0 h-full w-72 max-w-[85vw] transform transition-transform duration-300 ease-in-out bg-white ${
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
