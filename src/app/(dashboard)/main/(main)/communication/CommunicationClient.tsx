"use client";

import { useState, useMemo, useEffect } from "react";
import { PageHeader, SearchField, tableFrameClass, tbodyClass } from "@/components/console/layout";
import { notify } from "@/components/console/toastBus";
import { MessageSquare, User, Phone, Edit, Check, X, PhoneCall, Building2, ChevronRight, ChevronLeft } from "lucide-react";
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
  const [columnOrder, setColumnOrder] = useState<{id: string, title: string, type: string}[]>([]);

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

  useEffect(() => {
    const baseCols = [
      { id: 'ASSOCIATION', title: 'البريد الالكتروني ورقم الجوال', type: 'base' },
      { id: 'CHAIRMAN', title: 'رئيس مجلس الإدارة', type: 'base' },
      { id: 'CEO', title: 'المدير التنفيذي', type: 'base' }
    ];
    const serviceCols = uniqueServiceNames.map(name => ({ id: name, title: name, type: 'service' }));
    const allCols = [...baseCols, ...serviceCols];

    setColumnOrder(prev => {
      if (prev.length === 0) return allCols;
      
      const prevIds = prev.map(p => p.id);
      const allIds = allCols.map(a => a.id);
      
      const filteredPrev = prev.filter(p => allIds.includes(p.id));
      const added = allCols.filter(a => !prevIds.includes(a.id));
      
      return [...filteredPrev, ...added];
    });
  }, [uniqueServiceNames]);

  const moveColumn = (index: number, direction: number) => {
    setColumnOrder(prev => {
      const newOrder = [...prev];
      const targetIndex = index + direction;
      if (targetIndex >= 0 && targetIndex < newOrder.length) {
        const temp = newOrder[index];
        newOrder[index] = newOrder[targetIndex];
        newOrder[targetIndex] = temp;
      }
      return newOrder;
    });
  };

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
      notify("error", res.error || "حدث خطأ");
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
      notify("error", res.error || "حدث خطأ");
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
      <div className="mb-6">
        <PageHeader
          icon={<MessageSquare className="w-6 h-6" />}
          title="مصفوفة التواصل والخدمات"
          description="عرض وإدارة مسؤولي التواصل لكل خدمة/مسار للجمعيات في جدول تفاعلي موحد"
          actions={
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="ابحث عن جمعية، خدمة، أو مسؤول..."
          label="بحث في مصفوفة التواصل"
          className="w-full md:w-80"
        />
          }
        />
      </div>

      <div className={tableFrameClass}>
        <div className="overflow-x-auto w-full max-h-[70vh] scrollbar-thin">
          <table className="w-full text-right text-caption border-collapse">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 shadow-[0_1px_0_rgb(226_232_240)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_1px_0_rgb(30_41_59)]">
              <tr>
                <th className="h-10 whitespace-nowrap text-meta font-medium text-slate-500 dark:text-slate-400 sticky right-0 z-20 w-48 border-l border-slate-200 bg-slate-50 px-3 dark:border-slate-800 dark:bg-slate-900">الجمعية</th>
                {columnOrder.map((col, index) => (
                  <th key={col.id} className="h-10 whitespace-nowrap text-meta font-medium text-slate-500 dark:text-slate-400 group/th min-w-[150px] border-l border-slate-200 px-2 text-center transition-colors hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800">
                    <div className="flex items-center justify-between gap-1 w-full">
                      <button 
                        onClick={() => moveColumn(index, -1)} 
                        disabled={index === 0}
                        className="rounded p-1 text-slate-400 opacity-0 outline-none transition-all hover:bg-slate-200 hover:text-primary focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/40 disabled:invisible group-hover/th:opacity-100 dark:hover:bg-slate-700"
                        title="تحريك لليمين"
                        aria-label={`تحريك عمود «${col.title}» لليمين`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <span className="flex-1 text-center">{col.title}</span>
                      <button 
                        onClick={() => moveColumn(index, 1)} 
                        disabled={index === columnOrder.length - 1}
                        className="rounded p-1 text-slate-400 opacity-0 outline-none transition-all hover:bg-slate-200 hover:text-primary focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/40 disabled:invisible group-hover/th:opacity-100 dark:hover:bg-slate-700"
                        title="تحريك لليسار"
                        aria-label={`تحريك عمود «${col.title}» لليسار`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {filteredCharities.length === 0 ? (
                <tr>
                  <td colSpan={uniqueServiceNames.length + 4} className="p-12 text-center text-slate-500 font-semibold text-caption">
                    لا يوجد نتائج تطابق بحثك
                  </td>
                </tr>
              ) : (
                filteredCharities.map(charity => (
                  <tr key={charity.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Charity Name Column (Sticky Right) */}
                    <td className="sticky right-0 z-10 border-l border-slate-200 bg-white px-3 py-2 align-middle dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-primary/5 dark:bg-primary/10 flex items-center justify-center shrink-0">
                          {charity.logoUrl ? (
                            <img src={charity.logoUrl} alt={charity.name} className="w-full h-full object-contain rounded-md" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-caption">
                          {charity.name}
                        </span>
                      </div>
                    </td>

                    {/* Dynamic Ordered Columns */}
                    {columnOrder.map((col) => {
                      if (col.type === 'base') {
                        const contactType = col.id as 'ASSOCIATION' | 'CHAIRMAN' | 'CEO';
                        
                        let name = "";
                        let phone = "";
                        let namePlaceholder = "";
                        const phonePlaceholder = "رقم الجوال";

                        if (contactType === 'ASSOCIATION') {
                          name = charity.email || ""; phone = charity.phone || ""; namePlaceholder = "البريد الالكتروني";
                        } else if (contactType === 'CHAIRMAN') {
                          name = charity.chairmanName || ""; phone = charity.chairmanPhone || ""; namePlaceholder = "اسم رئيس مجلس الإدارة";
                        } else if (contactType === 'CEO') {
                          name = charity.ceoName || ""; phone = charity.ceoPhone || ""; namePlaceholder = "اسم المدير التنفيذي";
                        }

                        const isEditing = editingCharityContact?.charityId === charity.id && editingCharityContact.type === contactType;

                        return (
                          <td key={col.id} className="border-l border-slate-200 bg-slate-50/40 px-2 py-1.5 align-middle dark:border-slate-800 dark:bg-slate-800/20">
                            {isEditing ? (
                              <div className="space-y-2 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-primary/30 min-w-[180px]">
                                <div className="relative">
                                  <User className="w-3 h-3 absolute right-2 top-2 text-slate-400" />
                                  <input 
                                    type={contactType === 'ASSOCIATION' ? "email" : "text"} 
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder={namePlaceholder}
                                    dir={contactType === 'ASSOCIATION' ? "ltr" : "rtl"}
                                    className="w-full pl-2 pr-7 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-caption font-semibold outline-none focus:border-primary"
                                  />
                                </div>
                                <div className="relative">
                                  <Phone className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                                  <input 
                                    type="text" 
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    placeholder={phonePlaceholder}
                                    dir="ltr"
                                    className="w-full pl-7 pr-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-caption font-semibold text-left outline-none focus:border-primary"
                                  />
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleSaveCharity(charity.id, contactType)}
                                    disabled={isSaving}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-white py-1 rounded text-caption font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                                  >
                                    {isSaving ? "حفظ..." : <Check className="w-3 h-3" />}
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    disabled={isSaving}
                                    className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-1 rounded text-caption font-semibold flex items-center justify-center"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="group/cell relative flex flex-col items-center justify-center p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-center min-h-[56px] min-w-[150px]">
                                {name || phone ? (
                                  <div className="space-y-1">
                                    <p className="font-semibold text-slate-700 dark:text-slate-200 break-words max-w-[180px]">
                                      {name || <span className="text-slate-400 italic font-medium">الاسم غير محدد</span>}
                                    </p>
                                    {phone && (
                                      <div className="flex items-center justify-center gap-1 text-caption font-semibold text-slate-500">
                                        <Phone className="w-2.5 h-2.5" />
                                        <span dir="ltr">{phone}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-caption font-medium">لم يتم التعيين</span>
                                )}

                                {/* Hover controls */}
                                <div className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50/90 opacity-0 shadow-sm transition-all focus-within:opacity-100 group-hover/cell:opacity-100 dark:bg-slate-800/95">
                                  {phone && (
                                    <button
                                      onClick={(e) => openWhatsApp(phone!, e)}
                                      className="rounded-md bg-emerald-50 p-1.5 text-emerald-600 outline-none transition-colors hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                                      title="واتساب"
                                      aria-label="مراسلة عبر واتساب"
                                    >
                                      <PhoneCall className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => startEditingCharity(charity, contactType, e)}
                                    className="rounded-md bg-slate-100 p-1.5 text-slate-600 outline-none transition-colors hover:bg-slate-200 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                                    title="تعديل"
                                    aria-label="تعديل المسؤول"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      } else {
                        // Service Column
                        const svcName = col.id;
                        const service = charity.services.find(s => s.name === svcName);
                        const isEditing = service && editingServiceId === service.id;

                        return (
                          <td key={svcName} className="border-l border-slate-200 px-2 py-1.5 align-middle dark:border-slate-800">
                            {!service ? (
                              <div className="text-center text-slate-300 dark:text-slate-700 py-4 select-none min-w-[150px]">—</div>
                            ) : isEditing ? (
                              <div className="space-y-2 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-primary/30 min-w-[180px]">
                                <div className="relative">
                                  <User className="w-3 h-3 absolute right-2 top-2 text-slate-400" />
                                  <input 
                                    type="text" 
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="اسم المسؤول"
                                    className="w-full pl-2 pr-7 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-caption font-semibold outline-none focus:border-primary"
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
                                    className="w-full pl-7 pr-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-caption font-semibold text-left outline-none focus:border-primary"
                                  />
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleSave(service.id)}
                                    disabled={isSaving}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-white py-1 rounded text-caption font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                                  >
                                    {isSaving ? "حفظ..." : <Check className="w-3 h-3" />}
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    disabled={isSaving}
                                    className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-1 rounded text-caption font-semibold flex items-center justify-center"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="group/cell relative flex flex-col items-center justify-center p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-center min-h-[56px] min-w-[150px]">
                                {service.responsibleName || service.responsiblePhone ? (
                                  <div className="space-y-1">
                                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                                      {service.responsibleName || <span className="text-slate-400 italic font-medium">الاسم غير محدد</span>}
                                    </p>
                                    {service.responsiblePhone && (
                                      <div className="flex items-center justify-center gap-1 text-caption font-semibold text-slate-500">
                                        <Phone className="w-2.5 h-2.5" />
                                        <span dir="ltr">{service.responsiblePhone}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-caption font-medium">لم يتم التعيين</span>
                                )}

                                {/* Hover controls */}
                                <div className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-lg bg-slate-50/90 opacity-0 shadow-sm transition-all focus-within:opacity-100 group-hover/cell:opacity-100 dark:bg-slate-800/95">
                                  {service.responsiblePhone && (
                                    <button
                                      onClick={(e) => openWhatsApp(service.responsiblePhone!, e)}
                                      className="rounded-md bg-emerald-50 p-1.5 text-emerald-600 outline-none transition-colors hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                                      title="واتساب"
                                      aria-label="مراسلة عبر واتساب"
                                    >
                                      <PhoneCall className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => startEditing(service, e)}
                                    className="rounded-md bg-slate-100 p-1.5 text-slate-600 outline-none transition-colors hover:bg-slate-200 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                                    title="تعديل"
                                    aria-label="تعديل المسؤول"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      }
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
