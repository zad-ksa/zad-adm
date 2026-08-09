import { Shield, Briefcase, Database, FileText, Globe, UserCheck, Eye, Lock, Bell, Mail, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleEscape);
    } else {
      document.body.style.overflow = "unset";
      document.removeEventListener("keydown", handleEscape);
    }

    return () => {
      document.body.style.overflow = "unset";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const policies = [
    {
      id: "intro",
      icon: <Shield className="w-5 h-5 text-emerald-500" />,
      title: "1. مقدمة",
      content: (
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
          تلتزم شركة زاد للخدمات التنموية بحماية خصوصية بياناتكم الشخصية وفقاً لنظام حماية البيانات الشخصية الصادر بالمرسوم الملكي رقم (م/19). توضح هذه السياسة كيفية جمع واستخدام وحماية بيانات أعضاء وموظفي شركة زاد التنموية.
        </p>
      )
    },
    {
      id: "scope",
      icon: <Briefcase className="w-5 h-5 text-primary" />,
      title: "2. نطاق السياسة",
      content: (
        <div>
          <p className="text-slate-600 dark:text-slate-300 mb-2 text-sm">تنطبق هذه السياسة على لوحة التحكم الداخلية وتشمل:</p>
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1 text-sm">
            <li>إدارة الجمعيات، الاستبيانات، المهام، الطلبات</li>
            <li>إدارة المخططات الزمنية والاجتماعات ومحاضرها</li>
            <li>لوحة التحكم الإدارية وحسابات المانحين</li>
          </ul>
        </div>
      )
    },
    {
      id: "data-collected",
      icon: <Database className="w-5 h-5 text-indigo-500" />,
      title: "3. البيانات التي نجمعها",
      content: (
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">بيانات التسجيل:</h4>
            <p className="text-slate-600 dark:text-slate-300">الاسم، رقم الجوال للمصادقة، المسمى الوظيفي والصلاحيات.</p>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">بيانات التشغيل والجمعيات:</h4>
            <p className="text-slate-600 dark:text-slate-300">البيانات المالية والتشغيلية للجمعيات التي تديرها، محاضر الاجتماعات، المهام، والملفات المرفوعة.</p>
          </div>
        </div>
      )
    },
    {
      id: "processing",
      icon: <FileText className="w-5 h-5 text-teal-500" />,
      title: "4. أغراض معالجة البيانات",
      content: (
        <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1 text-sm">
          <li>تأمين الوصول للوحة التحكم</li>
          <li>إدارة الجمعيات المتعاقدة وتقديم الاستشارات</li>
          <li>تنظيم الاجتماعات ومتابعة المهام</li>
        </ul>
      )
    },
    {
      id: "sharing",
      icon: <Globe className="w-5 h-5 text-rose-500" />,
      title: "5. مشاركة البيانات مع أطراف ثالثة",
      content: (
        <p className="text-slate-600 dark:text-slate-300 text-sm">
          نشارك بياناتكم مع جهات موثوقة فقط (مثل Authentica لرسائل OTP، و Cloudinary للملفات، و Supabase لقواعد البيانات).
        </p>
      )
    },
    {
      id: "rights",
      icon: <UserCheck className="w-5 h-5 text-amber-500" />,
      title: "6. حقوق أصحاب البيانات",
      content: (
        <p className="text-slate-600 dark:text-slate-300 text-sm">
          يحق لكم الاطلاع، التصحيح، الحذف، تقييد المعالجة، ونقل البيانات وفقاً للنظام.
        </p>
      )
    },
    {
      id: "security",
      icon: <Lock className="w-5 h-5 text-slate-700 dark:text-slate-300" />,
      title: "7. حماية البيانات",
      content: (
        <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1 text-sm">
          <li>المصادقة عبر OTP</li>
          <li>تشفير جلسات المستخدم بـ JWT</li>
          <li>نظام صلاحيات متعدد المستويات (RBAC)</li>
        </ul>
      )
    },
    {
      id: "contact",
      icon: <Mail className="w-5 h-5 text-primary" />,
      title: "8. التواصل",
      content: (
        <p className="text-slate-600 dark:text-slate-300 text-sm">
          للاستفسارات، يرجى مراسلة مسؤول حماية البيانات عبر: zad.adm.ksa@gmail.com
        </p>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">سياسة الخصوصية والاستخدام</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">لوحة تحكم موظفي وأعضاء زاد</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {policies.map((policy) => (
              <div key={policy.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                    {policy.icon}
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{policy.title}</h3>
                </div>
                {policy.content}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 flex justify-end bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
}
