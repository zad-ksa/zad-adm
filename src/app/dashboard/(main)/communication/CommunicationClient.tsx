"use client";

import { useState, useMemo } from "react";
import { MessageSquare, Building2, User, Phone, Edit, Check, X, PhoneCall, Search, ChevronDown, ChevronUp, Briefcase } from "lucide-react";
import { updateServiceResponsible } from "@/app/actions/communication";

type UnifiedService = {
  id: string;
  name: string;
  department: string | null;
  responsibleName: string | null;
  responsiblePhone: string | null;
  isPillar: boolean;
};

type Charity = {
  id: string;
  name: string;
  services: UnifiedService[];
};

export default function CommunicationClient({ charities }: { charities: Charity[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCharities, setExpandedCharities] = useState<Set<string>>(new Set());
  
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const toggleCharity = (charityId: string) => {
    setExpandedCharities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(charityId)) {
        newSet.delete(charityId);
      } else {
        newSet.add(charityId);
      }
      return newSet;
    });
  };

  const filteredCharities = useMemo(() => {
    return charities.filter(c => c.name.includes(searchQuery));
  }, [charities, searchQuery]);

  const startEditing = (service: UnifiedService, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingServiceId(service.id);
    setEditName(service.responsibleName || "");
    setEditPhone(service.responsiblePhone || "");
  };

  const cancelEditing = () => {
    setEditingServiceId(null);
    setEditName("");
    setEditPhone("");
  };

  const handleSave = async (serviceId: string) => {
    setIsSaving(true);
    const res = await updateServiceResponsible(serviceId, editName.trim() || null, editPhone.trim() || null);
    setIsSaving(false);
    if (res.success) {
      setEditingServiceId(null);
    } else {
      alert(res.error || "حدث خطأ");
    }
  };

  const openWhatsApp = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let formattedPhone = phone.replace(/[^0-9]/g, "");
    if (formattedPhone.startsWith("05")) {
      formattedPhone = "966" + formattedPhone.slice(1);
    }
    window.open(`https://wa.me/${formattedPhone}`, "_blank");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto w-full font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">التواصل والخدمات</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">إدارة مسؤولي التواصل لجميع مسارات وخدمات الجمعيات</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-5 h-5 absolute right-4 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث عن اسم الجمعية..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-12 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500">
          <div className="col-span-8 md:col-span-5">اسم الجمعية</div>
          <div className="col-span-4 md:col-span-5 hidden md:block text-center">إحصائيات</div>
          <div className="col-span-4 md:col-span-2 text-left">التفاصيل</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredCharities.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-bold">لا يوجد نتائج تطابق بحثك</div>
          ) : (
            filteredCharities.map(charity => {
              const isExpanded = expandedCharities.has(charity.id);
              const pillarsCount = charity.services.filter(s => s.isPillar).length;
              const genericCount = charity.services.length - pillarsCount;

              return (
                <div key={charity.id} className="flex flex-col transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  {/* Row */}
                  <div 
                    onClick={() => toggleCharity(charity.id)}
                    className="grid grid-cols-12 gap-4 p-5 items-center cursor-pointer group"
                  >
                    <div className="col-span-8 md:col-span-5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-105">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{charity.name}</span>
                    </div>

                    <div className="col-span-4 md:col-span-5 hidden md:flex items-center justify-center gap-3">
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-900/50">
                        {pillarsCount} مسارات أساسية
                      </span>
                      {genericCount > 0 && (
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-900/50">
                          {genericCount} خدمات
                        </span>
                      )}
                    </div>

                    <div className="col-span-4 md:col-span-2 flex items-center justify-end text-slate-400 group-hover:text-primary transition-colors">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Expanded Content (Sub-Table) */}
                  {isExpanded && (
                    <div className="bg-slate-50/80 dark:bg-slate-800/30 p-5 border-t border-slate-100 dark:border-slate-800">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {charity.services.map(service => (
                          <div key={service.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-sm relative overflow-hidden">
                            
                            {/* Visual Indicator for Pillar */}
                            {service.isPillar && (
                              <div className="absolute top-0 right-0 w-2 h-full bg-amber-400/80" />
                            )}
                            
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-2">
                                {service.isPillar ? (
                                  <Briefcase className="w-4 h-4 text-amber-500 shrink-0" />
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mx-1" />
                                )}
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                  {service.name}
                                </h3>
                              </div>

                              {editingServiceId === service.id ? (
                                <div className="space-y-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-primary/20">
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">اسم المسؤول</label>
                                    <div className="relative">
                                      <User className="w-3.5 h-3.5 absolute right-3 top-2 text-slate-400" />
                                      <input 
                                        type="text" 
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full pl-3 pr-8 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold outline-none focus:border-primary"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">رقم التواصل</label>
                                    <div className="relative">
                                      <Phone className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-400" />
                                      <input 
                                        type="text" 
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                        dir="ltr"
                                        className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-left outline-none focus:border-primary"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      onClick={() => handleSave(service.id)}
                                      disabled={isSaving}
                                      className="flex-1 bg-primary hover:bg-primary/90 text-white py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                                    >
                                      {isSaving ? "جاري الحفظ..." : <><Check className="w-3.5 h-3.5" />حفظ</>}
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      disabled={isSaving}
                                      className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                                    >
                                      <X className="w-3.5 h-3.5" />إلغاء
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1 pl-2">
                                  <div className="flex items-start sm:items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                      <User className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                        {service.responsibleName || <span className="text-slate-400 italic font-medium">غير محدد</span>}
                                      </p>
                                      {service.responsiblePhone && (
                                        <p className="text-[11px] font-bold text-slate-500 mt-0.5 flex items-center gap-1.5" dir="ltr">
                                          <Phone className="w-3 h-3 shrink-0" />
                                          {service.responsiblePhone}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                                    {service.responsiblePhone && (
                                      <button
                                        onClick={(e) => openWhatsApp(service.responsiblePhone!, e)}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-md text-[11px] font-bold transition-colors"
                                        title="مراسلة عبر واتساب"
                                      >
                                        <PhoneCall className="w-3 h-3" />
                                        واتساب
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => startEditing(service, e)}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-[11px] font-bold transition-colors"
                                    >
                                      <Edit className="w-3 h-3" />
                                      تعديل
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
