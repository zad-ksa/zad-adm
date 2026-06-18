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

  // Listen to toggle-sidebar custom event from Header
  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent<{ isOpen?: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.isOpen === "boolean") {
        setIsOpen(customEvent.detail.isOpen);
      } else {
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => {
      window.removeEventListener("toggle-sidebar", handleToggle);
    };
  }, []);

  // Sync sidebar state back to Header
  useEffect(() => {
    const event = new CustomEvent("sidebar-state-change", {
      detail: { isOpen }
    });
    window.dispatchEvent(event);
  }, [isOpen]);

  const filteredCharities = charities.filter(c => c.name.includes(search));

  const sidebarContent = (
    <div className="bg-white p-6 flex flex-col h-full border-l border-slate-200/80">
      {/* Sidebar Header with Close Button */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 rounded-xl flex items-center justify-center text-primary font-extrabold text-lg shadow-inner">
            ز
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">زاد التنموية</h2>
            <p className="text-[11px] text-slate-500 font-medium">لوحة تحكم الشركة</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center cursor-pointer select-none active:scale-95 lg:hidden"
          title="إغلاق القائمة"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* Add Charity Button */}
      <div className="mb-6 shrink-0">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-primary/5 text-primary border border-primary/10 font-bold py-2.5 px-4 rounded-xl hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer select-none active:scale-[0.98] text-sm hover:shadow-lg hover:shadow-primary/10"
        >
          <span className="text-lg font-light leading-none">+</span> إضافة جمعية جديدة
        </button>
      </div>

      {/* Search Input */}
      <div className="mb-6 shrink-0 relative">
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <input
          type="text"
          placeholder="البحث عن جمعية..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-50 border border-slate-100 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white text-slate-800 transition-all placeholder-slate-400 font-medium"
        />
      </div>

      {/* Charity List */}
      <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-1.5 custom-scrollbar">
        <div className="text-[10px] font-bold text-slate-400 mb-3 px-2 uppercase tracking-wider">الجمعيات المتعاقد معها</div>
        {filteredCharities.length > 0 ? (
          filteredCharities.map((charity) => (
            <Link
              key={charity.id}
              href={`/charity/${encodeURIComponent(charity.name)}`}
              className="block px-3 py-2.5 rounded-xl text-slate-600 hover:bg-primary/5 hover:text-primary font-bold transition-all duration-200 truncate text-sm hover:-translate-x-1 hover:pr-4"
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
      {/* Desktop Collapsible Sidebar (using width animation to push/pull content) */}
      <aside
        className={`transition-all duration-300 ease-in-out shrink-0 overflow-hidden hidden lg:block sticky top-20 h-[calc(100vh-5rem)] bg-white ${
          isOpen ? "w-72 opacity-100 border-l border-slate-200/80" : "w-0 opacity-0 pointer-events-none"
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
          className={`absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsOpen(false)}
        />
        
        {/* Drawer content */}
        <div
          className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] transform transition-transform duration-300 ease-in-out bg-white shadow-2xl ${
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
