"use client";

import { useState, useMemo } from "react";
import { MessageSquare, User, Phone, Edit, Check, X, PhoneCall, Search, Building2, Briefcase } from "lucide-react";
import { updateServiceResponsible, updateCharityContact } from "@/app/actions/communication";

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
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  chairmanName?: string | null;
  chairmanPhone?: string | null;
  ceoName?: string | null;
  ceoPhone?: string | null;
  services: UnifiedService[];
};

export default function CommunicationClient({ charities }: { charities: Charity[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingCharityContact, setEditingCharityContact] = useState<{ charityId: string, type: 'ASSOCIATION' | 'CHAIRMAN' | 'CEO' } | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const uniqueServiceNames = useMemo(() => {
    const pillars = new Set<string>();
    const customs = new Set<string>();
    charities.forEach(c => {
      c.services.forEach(s => {
        if (s.name) {
          if (s.isPillar) {
            pillars.add(s.name);
          } else {
            customs.add(s.name);
          }
        }
      });
    });
    const pillarsArr = Array.from(pillars);
    const customsArr = Array.from(customs).filter(name => !pillars.has(name));
    return [...pillarsArr, ...customsArr];
  }, [charities]);

  const filteredCharities = useMemo(() => {
    if (!searchQuery.trim()) return charities;
    const lowerQuery = searchQuery.toLowerCase();
    return charities.filter(c => {
      // Matches charity name
      if (c.name.toLowerCase().includes(lowerQuery)) return true;
      // Matches any of its service details
      return c.services.some(s => 
        s.name.toLowerCase().includes(lowerQuery) ||
        (s.responsibleName && s.responsibleName.toLowerCase().includes(lowerQuery)) ||
        (s.responsiblePhone && s.responsiblePhone.includes(lowerQuery))
      ) ||
      (c.chairmanName && c.chairmanName.toLowerCase().includes(lowerQuery)) ||
      (c.ceoName && c.ceoName.toLowerCase().includes(lowerQuery)) ||
      (c.email && c.email.toLowerCase().includes(lowerQuery)) ||
      (c.phone && c.phone.includes(lowerQuery));
    });
  }, [charities, searchQuery]);

  const startEditing = (service: UnifiedService, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingServiceId(service.id);
    setEditingCharityContact(null);
    setEditName(service.responsibleName || "");
    setEditPhone(service.responsiblePhone || "");
  };

  const startEditingCharity = (charity: Charity, type: 'ASSOCIATION' | 'CHAIRMAN' | 'CEO', e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingServiceId(null);
    setEditingCharityContact({ charityId: charity.id, type });
    if (type === 'ASSOCIATION') {
      setEditName(charity.email || "");
      setEditPhone(charity.phone || "");
    } else if (type === 'CHAIRMAN') {
      setEditName(charity.chairmanName || "");
      setEditPhone(charity.chairmanPhone || "");
    } else if (type === 'CEO') {
      setEditName(charity.ceoName || "");
      setEditPhone(charity.ceoPhone || "");
    }
  };

  const cancelEditing = () => {
    setEditingServiceId(null);
    setEditingCharityContact(null);
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

  const handleSaveCharity = async (charityId: string, type: 'ASSOCIATION' | 'CHAIRMAN' | 'CEO') => {
    setIsSaving(true);
    let data = {};
    if (type === 'ASSOCIATION') {
      data = { email: editName.trim() || null, phone: editPhone.trim() || null };
    } else if (type === 'CHAIRMAN') {
      data = { chairmanName: editName.trim() || null, chairmanPhone: editPhone.trim() || null };
    } else if (type === 'CEO') {
      data = { ceoName: editName.trim() || null, ceoPhone: editPhone.trim() || null };
    }
    const res = await updateCharityContact(charityId, data);
    setIsSaving(false);
    if (res.success) {
      setEditingCharityContact(null);
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
    <div className="p-6 max-w-7xl mx-auto w-full font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">مصفوفة التواصل والخدمات</h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">عرض وإدارة مسؤولي التواصل لكل خدمة/مسار للجمعيات في جدول تفاعلي موحد</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث عن جمعية، خدمة، أو مسؤول..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto w-full max-h-[70vh] scrollbar-thin">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-2 py-2 font-bold text-xs whitespace-nowrap bg-slate-50 dark:bg-slate-800 sticky right-0 z-20 border-l border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.05)] w-48">الجمعية</th>
                <th className="px-2 py-2 font-bold text-xs whitespace-nowrap border-l border-slate-200 dark:border-slate-700 text-center min-w-[150px]">البريد الالكتروني ورقم الجوال</th>
                <th className="px-2 py-2 font-bold text-xs whitespace-nowrap border-l border-slate-200 dark:border-slate-700 text-center min-w-[150px]">رئيس مجلس الإدارة</th>
                <th className="px-2 py-2 font-bold text-xs whitespace-nowrap border-l border-slate-200 dark:border-slate-700 text-center min-w-[150px]">المدير التنفيذي</th>
                {uniqueServiceNames.map(name => (
                  <th key={name} className="px-2 py-2 font-bold text-xs whitespace-nowrap border-l border-slate-200 dark:border-slate-700 text-center min-w-[150px]">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCharities.length === 0 ? (
                <tr>
                  <td colSpan={uniqueServiceNames.length + 4} className="p-12 text-center text-slate-500 font-bold text-sm">
                    لا يوجد نتائج تطابق بحثك
                  </td>
                </tr>
              ) : (
                filteredCharities.map(charity => (
                  <tr key={charity.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Charity Name Column (Sticky Right) */}
                    <td className="px-2 py-2 align-middle bg-white dark:bg-slate-900 sticky right-0 z-10 border-l border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-primary/5 dark:bg-primary/10 flex items-center justify-center shrink-0">
                          {charity.logoUrl ? (
                            <img src={charity.logoUrl} alt={charity.name} className="w-full h-full object-contain rounded-md" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {charity.name}
                        </span>
                      </div>
                    </td>

                    {/* New Columns */}
                    {[
                      { type: 'ASSOCIATION' as const, name: charity.email, phone: charity.phone, namePlaceholder: "البريد الالكتروني", phonePlaceholder: "رقم الجوال" },
                      { type: 'CHAIRMAN' as const, name: charity.chairmanName, phone: charity.chairmanPhone, namePlaceholder: "اسم رئيس مجلس الإدارة", phonePlaceholder: "رقم الجوال" },
                      { type: 'CEO' as const, name: charity.ceoName, phone: charity.ceoPhone, namePlaceholder: "اسم المدير التنفيذي", phonePlaceholder: "رقم الجوال" }
                    ].map((col) => {
                      const isEditing = editingCharityContact?.charityId === charity.id && editingCharityContact.type === col.type;

                      return (
                        <td key={col.type} className="px-2 py-1.5 align-middle border-l border-slate-200 dark:border-slate-700 bg-slate-50/20 dark:bg-slate-800/20">
                          {isEditing ? (
                            <div className="space-y-2 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-primary/30">
                              <div className="relative">
                                <User className="w-3 h-3 absolute right-2 top-2 text-slate-400" />
                                <input 
                                  type={col.type === 'ASSOCIATION' ? "email" : "text"} 
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  placeholder={col.namePlaceholder}
                                  dir={col.type === 'ASSOCIATION' ? "ltr" : "rtl"}
                                  className="w-full pl-2 pr-7 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold outline-none focus:border-primary"
                                />
                              </div>
                              <div className="relative">
                                <Phone className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                                <input 
                                  type="text" 
                                  value={editPhone}
                                  onChange={(e) => setEditPhone(e.target.value)}
                                  placeholder={col.phonePlaceholder}
                                  dir="ltr"
                                  className="w-full pl-7 pr-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold text-left outline-none focus:border-primary"
                                />
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleSaveCharity(charity.id, col.type)}
                                  disabled={isSaving}
                                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                                >
                                  {isSaving ? "حفظ..." : <Check className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={isSaving}
                                  className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-1 rounded text-[10px] font-bold flex items-center justify-center"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="group/cell relative flex flex-col items-center justify-center p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-center min-h-[56px]">
                              {col.name || col.phone ? (
                                <div className="space-y-1">
                                  <p className="font-bold text-slate-700 dark:text-slate-200 break-words max-w-[180px]">
                                    {col.name || <span className="text-slate-400 italic font-medium">الاسم غير محدد</span>}
                                  </p>
                                  {col.phone && (
                                    <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500">
                                      <Phone className="w-2.5 h-2.5" />
                                      <span dir="ltr">{col.phone}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px] font-medium">لم يتم التعيين</span>
                              )}

                              {/* Hover controls */}
                              <div className="opacity-0 group-hover/cell:opacity-100 absolute inset-0 bg-slate-50/90 dark:bg-slate-800/95 flex items-center justify-center gap-1.5 rounded-lg transition-all shadow-sm">
                                {col.phone && (
                                  <button
                                    onClick={(e) => openWhatsApp(col.phone!, e)}
                                    className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                                    title="واتساب"
                                  >
                                    <PhoneCall className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => startEditingCharity(charity, col.type, e)}
                                  className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-primary dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 rounded-md transition-colors"
                                  title="تعديل"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Services Columns */}
                    {uniqueServiceNames.map(svcName => {
                      const service = charity.services.find(s => s.name === svcName);
                      const isEditing = service && editingServiceId === service.id;

                      return (
                        <td key={svcName} className="px-2 py-1.5 align-middle border-l border-slate-200 dark:border-slate-700">
                          {!service ? (
                            <div className="text-center text-slate-300 dark:text-slate-700 py-4 select-none">—</div>
                          ) : isEditing ? (
                            <div className="space-y-2 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-primary/30">
                              <div className="relative">
                                <User className="w-3 h-3 absolute right-2 top-2 text-slate-400" />
                                <input 
                                  type="text" 
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  placeholder="اسم المسؤول"
                                  className="w-full pl-2 pr-7 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold outline-none focus:border-primary"
                                />
                              </div>
                              <div className="relative">
                                <Phone className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                                <input 
                                  type="text" 
                                  value={editPhone}
                                  onChange={(e) => setEditPhone(e.target.value)}
                                  placeholder="رقم التواصل"
                                  dir="ltr"
                                  className="w-full pl-7 pr-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold text-left outline-none focus:border-primary"
                                />
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleSave(service.id)}
                                  disabled={isSaving}
                                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                                >
                                  {isSaving ? "حفظ..." : <Check className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={isSaving}
                                  className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-1 rounded text-[10px] font-bold flex items-center justify-center"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="group/cell relative flex flex-col items-center justify-center p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-center min-h-[56px]">
                              {service.responsibleName || service.responsiblePhone ? (
                                <div className="space-y-1">
                                  <p className="font-bold text-slate-700 dark:text-slate-200">
                                    {service.responsibleName || <span className="text-slate-400 italic font-medium">الاسم غير محدد</span>}
                                  </p>
                                  {service.responsiblePhone && (
                                    <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500">
                                      <Phone className="w-2.5 h-2.5" />
                                      <span dir="ltr">{service.responsiblePhone}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px] font-medium">لم يتم التعيين</span>
                              )}

                              {/* Hover controls */}
                              <div className="opacity-0 group-hover/cell:opacity-100 absolute inset-0 bg-slate-50/90 dark:bg-slate-800/95 flex items-center justify-center gap-1.5 rounded-lg transition-all shadow-sm">
                                {service.responsiblePhone && (
                                  <button
                                    onClick={(e) => openWhatsApp(service.responsiblePhone!, e)}
                                    className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                                    title="واتساب"
                                  >
                                    <PhoneCall className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => startEditing(service, e)}
                                  className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-primary dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 rounded-md transition-colors"
                                  title="تعديل"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
