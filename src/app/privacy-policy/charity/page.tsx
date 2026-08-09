"use client";

import { useTheme } from "next-themes";
import Link from "next/link";
import { ArrowRight, Shield, Lock, FileText, Database, Globe, Eye, UserCheck, Bell, Mail, Sun, Moon, Building2 } from "lucide-react";
import ZadLogo from "@/components/ZadLogo";
import { Cairo } from "next/font/google";
import { useEffect, useState } from "react";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "600", "700", "900"] });

export default function CharityPrivacyPolicyPage() {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    document.title = "سياسة الخصوصية — بوابة الجمعيات | زاد التنموية";
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const policies = [
    {
      id: "intro",
      icon: <Shield className="w-6 h-6 text-emerald-500" />,
      title: "1. مقدمة",
      content: (
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          تلتزم شركة زاد للخدمات التنموية ("الشركة"، "نحن") بحماية خصوصية بياناتكم الشخصية وفقاً لنظام حماية البيانات الشخصية الصادر بالمرسوم الملكي رقم (م/19) وتاريخ 1443/2/9هـ ولائحته التنفيذية. توضح هذه السياسة كيفية جمع واستخدام وحماية بياناتكم عند استخدام بوابة الجمعيات الخاصة بمنصتنا.
        </p>
      )
    },
    {
      id: "scope",
      icon: <Building2 className="w-6 h-6 text-primary" />,
      title: "2. نطاق السياسة",
      content: (
        <div>
          <p className="text-slate-600 dark:text-slate-300 mb-3">تنطبق هذه السياسة حصرياً على بوابة الجمعيات المتاحة عبر المسار (/portal) والتي تشمل الخدمات التالية:</p>
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-2">
            <li>متابعة المخططات والمراحل الزمنية للخدمات المقدمة من زاد</li>
            <li>الاطلاع على دليل الحوكمة الشامل ومعايير المركز الوطني لتنمية القطاع غير الربحي</li>
            <li>تصنيف الجمعية حسب حجمها وعرض متطلبات الامتثال المناسبة</li>
            <li>تبديل الجمعيات (للمستخدمين المرتبطين بأكثر من جمعية)</li>
          </ul>
        </div>
      )
    },
    {
      id: "data-collected",
      icon: <Database className="w-6 h-6 text-indigo-500" />,
      title: "3. البيانات التي نجمعها",
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">3.1 بيانات التسجيل والمصادقة:</h4>
            <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1">
              <li>الاسم الكامل</li>
              <li>رقم الجوال (يُستخدم كوسيلة المصادقة الوحيدة عبر رمز التحقق OTP)</li>
              <li>المسمى الوظيفي في الجمعية</li>
              <li>لا نقوم بجمع أو تخزين كلمات مرور لمستخدمي بوابة الجمعيات</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">3.2 بيانات الجمعية:</h4>
            <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1">
              <li>اسم الجمعية وشعارها</li>
              <li>تصنيف حجم الجمعية المختار (متناهية الصغر، صغيرة، متوسطة، كبيرة، متناهية الكبر)</li>
              <li>بيانات الربط بين المستخدم والجمعيات التابعة له</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">3.3 بيانات الخدمات التشغيلية:</h4>
            <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1">
              <li>المخططات الزمنية ومراحل تنفيذ الخدمات</li>
              <li>حالة الخطوات والمراحل (مكتملة، جارية، لم تبدأ)</li>
              <li>أسماء الخدمات المقدمة وأقسامها (تخطيط استراتيجي، حوكمة، مالية)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">3.4 بيانات الحوكمة:</h4>
            <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1">
              <li>معايير الحوكمة المطبقة حسب تصنيف الجمعية</li>
              <li>الممارسات والإجراءات والوثائق المطلوبة</li>
              <li>تفضيل حجم الجمعية المحفوظ محلياً</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">3.5 بيانات تقنية:</h4>
            <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1">
              <li>عنوان IP ونوع المتصفح</li>
              <li>بيانات الجلسة المشفّرة (JWT)</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: "processing",
      icon: <FileText className="w-6 h-6 text-teal-500" />,
      title: "4. أغراض معالجة البيانات",
      content: (
        <div>
          <p className="text-slate-600 dark:text-slate-300 mb-3">نعالج بياناتكم حصرياً للأغراض التالية:</p>
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-2">
            <li>التحقق من هويتكم وتأمين الوصول لبوابة الجمعية المخصصة لكم</li>
            <li>عرض المخططات الزمنية ومتابعة تقدم الخدمات المقدمة لجمعيتكم</li>
            <li>توفير دليل الحوكمة المناسب لتصنيف جمعيتكم</li>
            <li>تمكين التبديل بين الجمعيات (في حال ارتباطكم بأكثر من جمعية)</li>
            <li>حفظ تفضيلاتكم (مثل تصنيف حجم الجمعية) لتسهيل التجربة</li>
          </ul>
        </div>
      )
    },
    {
      id: "sharing",
      icon: <Globe className="w-6 h-6 text-rose-500" />,
      title: "5. مشاركة البيانات مع أطراف ثالثة",
      content: (
        <div>
          <p className="text-slate-600 dark:text-slate-300 mb-3">نشارك الحد الأدنى من بياناتكم مع الجهات التالية فقط:</p>
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-2">
            <li><strong>Authentica:</strong> لإرسال رمز التحقق (OTP) عبر الرسائل النصية (رقم الجوال فقط)</li>
            <li><strong>Supabase:</strong> لتخزين البيانات في قاعدة البيانات بشكل آمن</li>
            <li><strong>Vercel:</strong> لاستضافة المنصة وتقديم الخدمة</li>
          </ul>
        </div>
      )
    },
    {
      id: "rights",
      icon: <UserCheck className="w-6 h-6 text-amber-500" />,
      title: "6. حقوق أصحاب البيانات (بموجب PDPL)",
      content: (
        <div>
          <p className="text-slate-600 dark:text-slate-300 mb-3">بموجب نظام حماية البيانات الشخصية، يحق لكم:</p>
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-2">
            <li>الاطلاع على بياناتكم الشخصية المحفوظة لدينا</li>
            <li>طلب تصحيح أي بيانات غير دقيقة</li>
            <li>طلب حذف بياناتكم (حق الإتلاف)</li>
            <li>طلب تقييد معالجة بياناتكم</li>
            <li>الاعتراض على أي معالجة لا تتوافق مع الأغراض المذكورة</li>
            <li>نقل بياناتكم إلى جهة أخرى</li>
          </ul>
        </div>
      )
    },
    {
      id: "retention",
      icon: <Eye className="w-6 h-6 text-teal-500" />,
      title: "7. مدة الاحتفاظ بالبيانات",
      content: (
        <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-2">
          <li><strong>بيانات الحساب:</strong> طوال فترة تفعيل الحساب + 5 سنوات بعد الإلغاء</li>
          <li><strong>بيانات الخدمات والمخططات الزمنية:</strong> طوال فترة العقد + 5 سنوات</li>
          <li><strong>بيانات الحوكمة:</strong> 5 سنوات</li>
          <li><strong>ملف تعريف الارتباط (الجلسة):</strong> 30 يوماً</li>
          <li><strong>تفضيل حجم الجمعية:</strong> سنة واحدة</li>
        </ul>
      )
    },
    {
      id: "security",
      icon: <Lock className="w-6 h-6 text-slate-700 dark:text-slate-300" />,
      title: "8. حماية البيانات",
      content: (
        <div>
          <p className="text-slate-600 dark:text-slate-300 mb-3">نطبق الإجراءات التالية لحماية بياناتكم:</p>
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-2">
            <li>المصادقة عبر رمز التحقق (OTP) لكل عملية تسجيل دخول (لا نستخدم كلمات مرور)</li>
            <li>تشفير جلسات المستخدم باستخدام JWT (خوارزمية HS256)</li>
            <li>ملفات تعريف ارتباط آمنة (httpOnly, secure, sameSite)</li>
            <li>تقييد الوصول للبوابة لمستخدمي الجمعيات المعتمدين فقط</li>
            <li>التحقق من ارتباط المستخدم بالجمعية قبل السماح بالوصول</li>
            <li>فصل تام بين بيانات الجمعيات المختلفة</li>
          </ul>
        </div>
      )
    },
    {
      id: "cookies",
      icon: <Globe className="w-6 h-6 text-cyan-500" />,
      title: "9. ملفات تعريف الارتباط والتخزين المحلي",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">ملفات تعريف الارتباط (Cookies):</h4>
            <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1">
              <li><strong>session:</strong> ملف جلسة المصادقة (ضروري، httpOnly، مشفّر، 30 يوماً)</li>
              <li><strong>preferredCharitySize:</strong> يحفظ تفضيل تصنيف حجم الجمعية (سنة واحدة)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">التخزين المحلي (localStorage):</h4>
            <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 space-y-1">
              <li><strong>preferredCharitySize:</strong> نسخة محلية من تفضيل حجم الجمعية لتسريع التحميل</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: "international",
      icon: <Globe className="w-6 h-6 text-blue-500" />,
      title: "10. النقل الدولي للبيانات",
      content: (
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          لتقديم خدماتنا، قد تُنقل بعض بياناتكم إلى خوادم مقدمي الخدمات السحابية خارج المملكة. نضمن توفير حماية مكافئة وفقاً لمتطلبات نظام حماية البيانات الشخصية (PDPL) الخاص بالنقل الدولي للبيانات.
        </p>
      )
    },
    {
      id: "updates",
      icon: <Bell className="w-6 h-6 text-orange-500" />,
      title: "11. التعديلات على السياسة",
      content: (
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          نحتفظ بحق تعديل هذه السياسة في أي وقت. سيتم إشعاركم بأي تغييرات جوهرية عبر المنصة.
        </p>
      )
    },
    {
      id: "contact",
      icon: <Mail className="w-6 h-6 text-primary" />,
      title: "12. التواصل",
      content: (
        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-white/10 mt-2">
          <p className="text-slate-600 dark:text-slate-300 mb-4">لأي استفسارات حول هذه السياسة أو لممارسة حقوقكم المتعلقة بالبيانات:</p>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-slate-800 dark:text-slate-200 font-medium">
              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <UserCheck className="w-4 h-4" />
              </span>
              مسؤول حماية البيانات: إدارة زاد التنموية
            </li>
            <li className="flex items-center gap-3 text-slate-800 dark:text-slate-200 font-medium">
              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Mail className="w-4 h-4" />
              </span>
              البريد الإلكتروني: zad.adm.ksa@gmail.com
            </li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300 ${cairo.className}`} dir="rtl">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="fixed top-6 left-6 p-3 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 backdrop-blur-md transition-all shadow-sm z-50"
        aria-label="Toggle Theme"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <Link
        href="/"
        className="fixed top-6 right-6 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 backdrop-blur-md transition-all shadow-sm z-50 font-bold text-sm"
      >
        <ArrowRight className="w-4 h-4" />
        العودة للرئيسية
      </Link>

      {/* Header */}
      <div className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] dark:opacity-[0.05]"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <div className="w-32 md:w-40 block">
              <ZadLogo isOpen={true} className="drop-shadow-md dark:brightness-0 dark:invert transition-all" />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold mb-6">
            <Building2 className="w-4 h-4" />
            خاصة ببوابة الجمعيات
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
            سياسة الخصوصية
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            توضح هذه السياسة كيفية تعاملنا مع بياناتكم الشخصية داخل بوابة الجمعيات، وفقاً لنظام حماية البيانات الشخصية السعودي (PDPL).
          </p>
          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            آخر تحديث: أغسطس 2026
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-slate-200 dark:border-white/10 hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-1.5 h-full bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-500/20 transition-colors"></div>
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <div className="shrink-0 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    {policy.icon}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{policy.title}</h2>
                    <div className="prose prose-slate dark:prose-invert max-w-none">{policy.content}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="py-8 text-center border-t border-slate-200 dark:border-white/10 mt-12 bg-white dark:bg-slate-900">
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          © {new Date().getFullYear()} شركة زاد للخدمات التنموية. جميع الحقوق محفوظة.
        </p>
      </footer>
    </div>
  );
}
