import { Shield, Briefcase, Database, FileText, Globe, UserCheck, Eye, Lock, Bell, Mail } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { btn } from "@/components/console/ui";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  // Escape وقفل التمرير يتولّاهما Dialog — كانا هنا بيدهما، وتنظيفهما يعيد
  // التمرير إلى «unset» ولو بقيت نافذةٌ أخرى مفتوحة.
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
    <Dialog
size="xl"
title="سياسة الخصوصية والاستخدام"
description="لوحة تحكم موظفي وأعضاء زاد"
onClose={onClose}
footer={
<>
<button type="button"
            onClick={onClose}
            className={btn.primary}
          >
            إغلاق النافذة
          </button>
</>
}
>
<div className="scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
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
</Dialog>
  );
}
