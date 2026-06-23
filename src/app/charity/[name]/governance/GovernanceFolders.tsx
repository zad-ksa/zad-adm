"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Folder as FolderIcon, User, FolderPlus, FileUp, Trash2, FileImage, FileText, Loader2 } from "lucide-react";
import GovernanceRegulationsManager from "./GovernanceRegulationsManager";

interface FolderItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  fileUrl?: string;
  fileType?: string;
  parentId: string;
}

export default function GovernanceFolders({ charityId, regulations, isAdmin }: any) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
  const [items, setItems] = useState<FolderItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    itemId: string;
    itemName: string;
    itemType: 'folder' | 'file';
  }>({ isOpen: false, itemId: "", itemName: "", itemType: 'file' });

  const folders = [
    { id: "services", title: "خدمات المركز الوطني" },
    { id: "employee-training", title: "الدورات التدريبية للموظفين" },
    { id: "basic-bylaws", title: "اللائحة الأساسية" },
    { id: "approved-regulations", title: "اللوائح والسياسات المعتمدة" },
    { id: "withdrawal-authorized", title: "المفوضين بالسحب من أرصدة الجمعية" },
    { id: "anti-terrorism-programs", title: "برامج التوعية من الارهاب وغسيل الاموال" },
    { id: "center-reports", title: "بلاغات المركز" },
    { id: "general-assembly-data", title: "بيانات أعضاء العمومية" },
    { id: "board-members-data", title: "بيانات أعضاء المجلس" },
    { id: "employees-data", title: "بيانات الموظفين" },
    { id: "project-licenses", title: "تراخيص المشاريع" },
    { id: "fundraising-licenses", title: "تراخيص جمع التبرعات والمتاجر الإلكترونية" },
    { id: "program-reports", title: "تقارير برامج وأنشطة الجمعية" },
    { id: "fundraising-submissions", title: "تقارير جمع التبرعات المرفوعة للمركز" },
    { id: "compliance-officer-reports", title: "تقارير مسؤول الالتزام" },
    { id: "quarterly-financial-reports", title: "تقرير المحاسب والتقارير الربعية" },
    { id: "general-assembly-letters", title: "خطابات اجتماعات العمومية" },
    { id: "center-letters", title: "خطابات المركز" },
    { id: "work-records", title: "سجلات العمل" },
    { id: "financial-operation-proofs", title: "شواهد مستندات العمليات المالية" },
    { id: "marketing-contracts", title: "عقود تسويق وبرامج المشاريع" },
    { id: "executive-director-authority", title: "قرار وصلاحيات المدير التنفيذي" },
    { id: "compliance-officer-appointment", title: "قرار تعيين مسؤول الالتزام ووصفه الوظيفي" },
    { id: "committee-decisions", title: "قرارات اللجان واجتماعاتها" },
    { id: "risk-assessment-decisions", title: "قرارات وأنشطة تقييم مخاطر غسل الأموال" },
    { id: "general-assembly-minutes", title: "محاضر العمومية وفرز الأصوات" },
    { id: "board-minutes", title: "محاضر مجلس الإدارة" },
  ];

  // تحميل البيانات عند تشغيل المكون
  useEffect(() => {
    const saved = localStorage.getItem(`governance_items_${charityId}`);
    if (saved) {
      setItems(JSON.parse(saved));
    } else {
      const defaultSubfolders: FolderItem[] = [
        { id: "assembly-attachments", name: "المرفقات", type: "folder", parentId: "general-assembly-minutes" },
        { id: "assembly-invitation", name: "دعوة أعضاء المجلس", type: "folder", parentId: "general-assembly-minutes" },
        { id: "assembly-minutes", name: "محضر الاجتماع", type: "folder", parentId: "general-assembly-minutes" }
      ];
      setItems(defaultSubfolders);
      localStorage.setItem(`governance_items_${charityId}`, JSON.stringify(defaultSubfolders));
    }
  }, [charityId]);

  const saveItems = (newItems: FolderItem[]) => {
    setItems(newItems);
    localStorage.setItem(`governance_items_${charityId}`, JSON.stringify(newItems));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentFolderId) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isAllowed = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'webp'].includes(fileExt || '');
    if (!isAllowed) {
      alert("عذراً، يرجى رفع ملفات PDF أو Word أو صور فقط.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload");
      }

      const data = await response.json();
      const newItem: FolderItem = {
        id: `file-${Date.now()}`,
        name: file.name,
        type: 'file',
        fileUrl: data.url,
        fileType: fileExt,
        parentId: currentFolderId
      };

      saveItems([...items, newItem]);
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء رفع الملف، يرجى المحاولة مرة أخرى.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleAddFolder = () => {
    if (!newFolderName.trim() || !currentFolderId) return;

    const newItem: FolderItem = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      type: 'folder',
      parentId: currentFolderId
    };

    saveItems([...items, newItem]);
    setNewFolderName("");
    setIsAddingFolder(false);
  };

  const getDescendantIds = (folderId: string, allItems: FolderItem[]): string[] => {
    const directChildren = allItems.filter(item => item.parentId === folderId);
    let ids = directChildren.map(c => c.id);
    for (const child of directChildren) {
      if (child.type === 'folder') {
        ids = [...ids, ...getDescendantIds(child.id, allItems)];
      }
    }
    return ids;
  };

  const handleExecuteDelete = () => {
    const { itemId, itemType } = deleteConfirm;
    if (!itemId) return;

    if (itemType === 'folder') {
      const idsToRemove = [itemId, ...getDescendantIds(itemId, items)];
      const newItems = items.filter(item => !idsToRemove.includes(item.id));
      saveItems(newItems);
    } else {
      const newItems = items.filter(item => item.id !== itemId);
      saveItems(newItems);
    }

    setDeleteConfirm({ isOpen: false, itemId: "", itemName: "", itemType: 'file' });
  };

  const handleGoBack = () => {
    if (folderPath.length <= 1) {
      setCurrentFolderId(null);
      setFolderPath([]);
    } else {
      const newPath = folderPath.slice(0, -1);
      setFolderPath(newPath);
      setCurrentFolderId(newPath[newPath.length - 1].id);
    }
  };

  const handleBreadcrumbClick = (idx: number) => {
    const newPath = folderPath.slice(0, idx + 1);
    setFolderPath(newPath);
    setCurrentFolderId(newPath[newPath.length - 1].id);
  };

  const handleGoToMain = () => {
    setCurrentFolderId(null);
    setFolderPath([]);
  };

  const FolderCard = ({ title }: { title: string }) => (
    <div className="relative group flex items-center justify-between h-[68px] p-3 bg-white dark:bg-slate-950/80 border border-slate-100 dark:border-slate-800/80 rounded-xl hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer select-none shadow-sm hover:shadow-md w-full text-right" dir="rtl">
      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors flex-1 pl-3 leading-relaxed line-clamp-2 overflow-hidden break-words">
        {title}
      </span>
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 relative">
        <FolderIcon className="w-5 h-5 fill-primary/20 text-primary" />
        <div className="absolute -bottom-0.5 -right-0.5 bg-white dark:bg-slate-900 rounded-full p-0.5 border border-primary/40">
          <User className="w-2.5 h-2.5 text-primary" />
        </div>
      </div>
      
      {/* Tooltip on hover */}
      <div className="absolute bottom-[105%] right-1/2 translate-x-1/2 hidden group-hover:block bg-slate-900 dark:bg-slate-950 text-white text-xs rounded-lg py-2 px-3 max-w-[220px] w-max shadow-xl border border-slate-850 dark:border-slate-800 pointer-events-none text-center z-35 leading-normal break-words animate-in fade-in zoom-in-95 duration-150">
        {title}
        <div className="absolute top-full right-1/2 translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-950"></div>
      </div>
    </div>
  );

  // عرض صفحة خدمات المركز الوطني
  if (currentFolderId === "services") {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
        <button 
          onClick={handleGoToMain}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-primary transition-colors font-medium bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 w-fit hover:shadow-md"
        >
          <ArrowRight className="w-5 h-5" />
          العودة للمجلدات
        </button>
        <GovernanceRegulationsManager charityId={charityId} regulations={regulations} isAdmin={isAdmin} />
      </div>
    );
  }

  // عرض محتويات المجلد الفرعي أو المجلد النشط
  if (currentFolderId && currentFolderId !== "services") {
    const folderItems = items.filter(item => item.parentId === currentFolderId);
    const subFolders = folderItems.filter(item => item.type === 'folder');
    const files = folderItems.filter(item => item.type === 'file');

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
        {/* شريط المسار والتحكم */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
          {/* Breadcrumbs */}
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <button 
              onClick={handleGoToMain}
              className="hover:text-primary transition-colors font-medium"
            >
              المجلدات الرئيسية
            </button>
            {folderPath.map((path, idx) => (
              <div key={path.id} className="flex items-center gap-1.5">
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <button
                  disabled={idx === folderPath.length - 1}
                  onClick={() => handleBreadcrumbClick(idx)}
                  className={`hover:text-primary transition-colors font-medium ${
                    idx === folderPath.length - 1 ? "text-slate-800 dark:text-slate-200 font-bold cursor-default" : ""
                  }`}
                >
                  {path.name}
                </button>
              </div>
            ))}
          </div>

          {/* أزرار التحكم */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddingFolder(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-all font-medium text-sm border border-primary/20"
            >
              <FolderPlus className="w-4 h-4" />
              <span>إضافة مجلد</span>
            </button>

            <label className="flex items-center gap-2 px-4 py-2 bg-primary text-white hover:bg-primary/95 rounded-xl cursor-pointer transition-all font-medium text-sm shadow-sm relative">
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin animate-duration-1000" />
                  <span>جاري الرفع...</span>
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4" />
                  <span>رفع ملف</span>
                </>
              )}
              <input
                type="file"
                className="hidden"
                disabled={isUploading}
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
              />
            </label>
          </div>
        </div>

        {/* عرض المحتوى */}
        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/80 shadow-md dark:shadow-xl min-h-[300px] transition-colors">
          {folderItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderIcon className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4 stroke-1" />
              <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">المجلد فارغ</h4>
              <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">لا توجد مجلدات أو ملفات هنا بعد. يمكنك إضافة مجلد جديد أو رفع ملف من الخيارات أعلاه.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* المجلدات الفرعية */}
              {subFolders.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">المجلدات الفرعية ({subFolders.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {subFolders.map(folder => (
                      <div 
                        key={folder.id} 
                        className="group relative flex items-center justify-between h-[68px] p-3 bg-white dark:bg-slate-950/80 border border-slate-100 dark:border-slate-800/80 rounded-xl hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer shadow-sm hover:shadow-md text-right w-full"
                        onClick={() => {
                          setCurrentFolderId(folder.id);
                          setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 pl-1">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <FolderIcon className="w-5 h-5 fill-primary/20 text-primary" />
                          </div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors line-clamp-2 overflow-hidden break-words flex-1 leading-relaxed">
                            {folder.name}
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({
                              isOpen: true,
                              itemId: folder.id,
                              itemName: folder.name,
                              itemType: 'folder'
                            });
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-450 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Tooltip */}
                        <div className="absolute bottom-[105%] right-1/2 translate-x-1/2 hidden group-hover:block bg-slate-900 dark:bg-slate-950 text-white text-xs rounded-lg py-2 px-3 max-w-[220px] w-max shadow-xl border border-slate-850 dark:border-slate-800 pointer-events-none text-center z-35 leading-normal break-words animate-in fade-in zoom-in-95 duration-150">
                          {folder.name}
                          <div className="absolute top-full right-1/2 translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-950"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* الملفات المرفوعة */}
              {files.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">الملفات المرفوعة ({files.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {files.map(file => {
                      const fileExt = file.fileType?.toLowerCase();
                      const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(fileExt || '');
                      const isWord = ['doc', 'docx'].includes(fileExt || '');
                      
                      let FileIconComponent = FileText;
                      let iconColorClass = "text-red-500 bg-red-50 dark:bg-red-950/20";
                      
                      if (isImage) {
                        FileIconComponent = FileImage;
                        iconColorClass = "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20";
                      } else if (isWord) {
                        FileIconComponent = FileText;
                        iconColorClass = "text-blue-500 bg-blue-50 dark:bg-blue-950/20";
                      }

                      return (
                        <div 
                          key={file.id} 
                          className="group relative flex items-center justify-between h-[68px] p-3 bg-white dark:bg-slate-950/80 border border-slate-100 dark:border-slate-800/80 rounded-xl hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer shadow-sm hover:shadow-md text-right w-full"
                          onClick={() => window.open(file.fileUrl, '_blank')}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0 pl-1">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconColorClass}`}>
                              <FileIconComponent className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors line-clamp-2 overflow-hidden break-words flex-1 leading-relaxed">
                              {file.name}
                            </span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({
                                isOpen: true,
                                itemId: file.id,
                                itemName: file.name,
                                itemType: 'file'
                              });
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-450 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* Tooltip */}
                          <div className="absolute bottom-[105%] right-1/2 translate-x-1/2 hidden group-hover:block bg-slate-900 dark:bg-slate-950 text-white text-xs rounded-lg py-2 px-3 max-w-[220px] w-max shadow-xl border border-slate-850 dark:border-slate-800 pointer-events-none text-center z-35 leading-normal break-words animate-in fade-in zoom-in-95 duration-150">
                            {file.name}
                            <div className="absolute top-full right-1/2 translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-950"></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button 
          onClick={handleGoBack}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-primary transition-colors font-medium bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 w-fit hover:shadow-md"
        >
          <ArrowRight className="w-5 h-5" />
          الرجوع للمستوى السابق
        </button>

        {/* Modal: إضافة مجلد */}
        {isAddingFolder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-150 dark:border-slate-700">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">إضافة مجلد جديد</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">يرجى كتابة اسم المجلد الفرعي الجديد.</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    اسم المجلد
                  </label>
                  <input
                    required
                    type="text"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white"
                    placeholder="مثال: المراسلات الصادرة"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddFolder();
                    }}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingFolder(false);
                      setNewFolderName("");
                    }}
                    className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleAddFolder}
                    disabled={!newFolderName.trim()}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/95 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    إضافة المجلد
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: تأكيد الحذف */}
        {deleteConfirm.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-150 dark:border-slate-700">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">تأكيد الحذف</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">هل أنت متأكد من هذه العملية؟</p>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
                  {deleteConfirm.itemType === 'folder' 
                    ? `سيتم حذف المجلد "${deleteConfirm.itemName}" بشكل نهائي مع كافة محتوياته من ملفات ومجلدات فرعية. لا يمكن التراجع عن هذا الإجراء.`
                    : `سيتم حذف الملف "${deleteConfirm.itemName}" بشكل نهائي من النظام. لا يمكن التراجع عن هذا الإجراء.`
                  }
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm({ isOpen: false, itemId: "", itemName: "", itemType: 'file' })}
                    className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteDelete}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium text-sm"
                  >
                    تأكيد الحذف
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // عرض المجلدات الرئيسية
  return (
    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/80 shadow-md dark:shadow-xl animate-in fade-in duration-500 transition-colors" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 pt-4 pb-4">
        {folders.map(folder => (
          <div 
            key={folder.id} 
            onClick={() => {
              setCurrentFolderId(folder.id);
              setFolderPath([{ id: folder.id, name: folder.title }]);
            }}
          >
            <FolderCard title={folder.title} />
          </div>
        ))}
      </div>
    </div>
  );
}
