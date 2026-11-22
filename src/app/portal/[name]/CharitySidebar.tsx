"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CHARITY_ATTENDANCE_ENABLED, isCharityMailOpen } from "@/lib/featureFlags";
import { hasCharityPermission, seesCharityServicesTab } from "@/lib/charityPermissions";
import { ArrowLeft, Briefcase, Coins, FolderOpen, Home, Mail, Megaphone, Palette, Scale, ShieldCheck, Target, Users, X } from "lucide-react";
import ZadLogo from "@/components/ZadLogo";
import PrivacyPolicyModal from "@/components/PrivacyPolicyModal";
import { useState, useEffect } from "react";

// --- Nav Item Component ---
function NavItem({ item, isActive, isOpen, onClick }: { item: any, isActive: boolean, isOpen: boolean, onClick?: () => void }) {
  const content = (
    <>
      <item.icon className={`w-4 h-4 shrink-0 transition-colors duration-300 ml-0 ${isOpen ? "ml-2.5" : ""} ${isActive ? "text-primary dark:text-teal-400" : "text-slate-400 group-hover:text-primary dark:group-hover:text-teal-400"}`} />
      {isOpen && <span className="whitespace-nowrap tracking-tight leading-none pt-0.5">{item.label || item.title}</span>}

      {item.comingSoon && isOpen && (
        <span className="mr-auto text-[10px] font-bold font-sans bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-300/50 dark:border-slate-600/50">
          قريباً
        </span>
      )}

      {/* البريد غير المقروء — يُعرض مطوياً كذلك، فالنقطة وحدها تكفي إشارةً */}
      {!item.comingSoon && item.badge > 0 && (
        isOpen ? (
          <span className="mr-auto min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">
            {item.badge}
          </span>
        ) : (
          <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-primary" />
        )
      )}
    </>
  );

  if (item.comingSoon) {
    return (
      <div
        title={!isOpen ? `${item.label || item.title} (قريباً)` : undefined}
        className={`flex items-center ${isOpen ? "justify-start px-2.5" : "justify-center"} py-1.5 rounded-lg text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 cursor-not-allowed opacity-70 text-[15px] font-medium mb-0.5`}
      >
        <item.icon className={`w-4 h-4 shrink-0 transition-all ${isOpen ? "ml-2.5" : "ml-0"} opacity-60`} />
        {isOpen && <span className="whitespace-nowrap tracking-tight leading-none pt-0.5">{item.label || item.title}</span>}
        {isOpen && (
          <span className="mr-auto text-[10px] font-bold font-sans bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-300/50 dark:border-slate-600/50">
            قريباً
          </span>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={!isOpen ? (item.label || item.title) : undefined}
      data-active={isActive}
      className={`charity-nav-item flex items-center ${isOpen ? "justify-start px-2.5" : "justify-center"} py-1.5 mb-0.5 rounded-lg text-[15px] font-medium tracking-tight group relative overflow-hidden ${isActive
        ? "bg-primary/[0.07] dark:bg-primary/[0.12] text-primary dark:text-teal-400 shadow-[inset_0_0_0_1px_rgb(15_118_110_/_.16)] dark:shadow-[inset_0_0_0_1px_rgb(45_212_191_/_.20)]"
        : "text-slate-600 dark:text-slate-400 hover:bg-primary/[0.04] dark:hover:bg-teal-400/[0.05] hover:text-primary dark:hover:text-teal-400"
        }`}
    >
      {content}
    </Link>
  );
}

export default function CharitySidebar({
  charityName,
  isOpen,
  setIsOpen,
  userType,
  permissions = [],
  isOfficial = false,
  unreadMail = 0,
  mediaWaiting = 0,
  mediaPlanEnabled = false,
  fundraisingEnabled = false,
}: {
  charityName: string;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  userType?: string;
  /** الفعليّةُ كما يحسبها التخطيط. */
  permissions?: string[];
  /** حسابُ الجمعية الرسميُّ — ويُقرأ هنا للتبويبات المشتقّة وحدَها. */
  isOfficial?: boolean;
  unreadMail?: number;
  mediaWaiting?: number;
  /** مفتاحُ ظهور تبويب الخطّة — بيد زاد. */
  mediaPlanEnabled?: boolean;
  /** تنميةُ الموارد: خدمةُ الجمعية والعلَم — يحسبهما التخطيط. */
  fundraisingEnabled?: boolean;
}) {
  const pathname = usePathname();
  const [activePath, setActivePath] = useState(decodeURIComponent(pathname));
  const [mounted, setMounted] = useState(false);
  // Keeps the mobile drawer shut on first paint — see the drawer below.
  const drawerOpen = isOpen && mounted;
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  useEffect(() => {
    setActivePath(decodeURIComponent(pathname));
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLinkClick = (href: string) => {
    setActivePath(decodeURIComponent(href));
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  const isCharityUser = userType === "CHARITY_USER";

  // Cosmetic only. Hiding a nav item does not protect the route — every page
  // under /portal re-checks the same permission on the server (see lib/portalAccess.ts).
  // A missing permission here just avoids showing a link that would 404.
  //
  // و`permissions` هي **الفعليّة** (يحسبها التخطيط): حسابُ الجمعية تدخل عنده
  // كلُّ الصلاحيات، فلا صفةَ تُفحص هنا. وكان يُفحص علَمٌ لا يُمرَّر أصلاً.
  const can = (permission: string) => hasCharityPermission(permissions, permission);

  // Each tab now shows only to someone who may open it. It used to be `show:
  // true` across the board, so every member saw every section and found out
  // which ones were theirs by clicking into a refusal.
  const mainItems = [
    // والرئيسيةُ أوّلُها: كانت البوّابةُ تُحوِّل الداخلَ إلى أوّل تبويبٍ
    // يملكه، فلا موضعَ يجمع ما ينتظره. وهي exact لأنّ كلَّ صفحةٍ تحتها.
    { id: "home", label: "الرئيسية", href: `/portal/${encodeURIComponent(charityName)}`, exact: true, icon: Home, show: true },
    // «الخدمات» تبويبٌ مشتقٌّ: يُعرض لمن له صلاحيّةٌ في خدمةٍ ما، وصفحتُه تسرد
    // خدماتِه وحدَها — لا صلاحيّةَ باسمه تُمنح (`view_services` متقاعدة).
    { id: "services", label: "الخدمات", href: `/portal/${encodeURIComponent(charityName)}/services`, exact: true, icon: Briefcase, show: seesCharityServicesTab(isOfficial, permissions) },
    // والحوكمةُ ليست `exact`: الدليلُ صفحةٌ تحتها (`/governance/standards`)،
    // وهي وجهتُه الدائمة — فتبويبٌ يُعلَّم في الباب وحدَه لا يُعلَّم أبداً.
    { id: "governance", label: "الحوكمة", href: `/portal/${encodeURIComponent(charityName)}/governance`, icon: Scale, show: can("view_governance") },
    // Viewing and raising a design request are one permission — see
    // charityPermissions.ts.
    { id: "design-requests", label: "طلبات التصاميم", href: `/portal/${encodeURIComponent(charityName)}/design-requests`, exact: true, icon: Palette, show: can("view_design_requests") },
    // الخطةُ الإعلاميةُ: تُنال بتفويض خدمة «الإعلامية» (انظر PermissionServiceLink)،
    // والعدّادُ ما ينتظر اعتمادَ الجمعية — وهو «التنبيهُ على التبويب».
    // والخطّةُ الإعلاميّةُ يراها كلُّ عضوٍ اطّلاعاً — تقويمُ جمعيتِه. والاعتمادُ
    // والتعديلُ لمن يحمل «تحرير الخطة الإعلامية»، والعدّادُ له وحدَه.
    { id: "media", label: "الخطة الإعلامية", href: `/portal/${encodeURIComponent(charityName)}/media`, exact: true, icon: Megaphone, show: mediaPlanEnabled, badge: mediaWaiting },
    // No permission: the library is reference material shared with every
    // charity, and it is read-only on the server whoever opens it.
    { id: "templates", label: "مكتبة النماذج", href: `/portal/${encodeURIComponent(charityName)}/templates`, exact: true, icon: FolderOpen, show: true },
    // بلا صلاحية كذلك: لكل عضوٍ صندوق بريد يصله سواء فُتح التبويب أو لم يُفتح،
    // وإخفاؤه لا يمنع وصول البريد بل يمنع قراءته.
    // البريد يُفتح بالاسم جمعيةً جمعية (CHARITY_MAIL_CHARITIES): حيث لم يُفتح
    // يظهر «قريباً» بلا رابط، وصفحته تردّ من يكتب عنوانها.
    isCharityMailOpen(charityName)
      ? { id: "mail", label: "البريد", href: `/portal/${encodeURIComponent(charityName)}/mail`, exact: true, icon: Mail, show: true, badge: unreadMail }
      : { id: "mail", label: "البريد", href: "#", comingSoon: true, icon: Mail, show: true },
    // No permission gates these two: they lead nowhere yet. Adding a checkbox
    // for a page that does not exist would tell whoever grants it that they had
    // controlled access to something — the mistake documented on `view_hr`.
    { id: "strategy", label: "الاستراتيجية", href: "#", comingSoon: true, icon: Target, show: true },
    // تنميةُ الموارد: تُعرض لجمعيةٍ تشملها خدمةُ «التسويق وتنمية الموارد
    // المالية» (ومؤقّتاً للمفتوح لها بالعلَم)، ولعضوٍ مُفوَّضٍ بالخدمة مُنح
    // صلاحيّتَها — فصلاحيّةُ خدمةٍ تخمد بلا تفويضها (effectiveCharityPermissions).
    // وحيث لم تُفتح يبقى التبويب «قريباً» بلا رابط، وصفحتُه تردّ من يكتب عنوانها.
    fundraisingEnabled && can("view_fundraising")
      ? { id: "finance", label: "تنمية الموارد المالية", href: `/portal/${encodeURIComponent(charityName)}/fundraising`, icon: Coins, show: true }
      : { id: "finance", label: "تنمية الموارد المالية", href: "#", comingSoon: true, icon: Coins, show: true },
    // Always visible, like every other section here. Where it lands depends on
    // the feature flag: with attendance on hold the only page left inside is
    // the employees list, so everyone goes straight there rather than to a
    // check-in screen that would just bounce back.
    {
      id: "hr",
      label: "الموارد البشرية",
      href: CHARITY_ATTENDANCE_ENABLED && !can("manage_charity_users")
        ? `/portal/${encodeURIComponent(charityName)}/hr/attendance`
        : `/portal/${encodeURIComponent(charityName)}/hr`,
      icon: Users,
      show: true,
    },
  ].filter((item) => item.show);

  const subItems: any[] = [];

  /**
   * الشريطُ ثابتٌ مفتوحٌ في الحاسوب — لا يُطوى.
   *
   * **ولمَ أُلغي الطيّ**: كان زرُّ الطيّ يُضيِّق الشريطَ إلى أيقوناتٍ بلا أسماء،
   * فتبويباتُ البوّابة تُعرف بأشكالها لا بأسمائها. وشريطُ لوحة زادٍ ثابتُ العرض
   * (`w-56`) بلا طيّ، فطيُّ هذا وحدَه يجعل للموقع شريطين بسلوكين. والأهمُّ أنّ
   * الطيَّ لا يُحفظ: يرجع مفتوحاً مع كلِّ صفحةٍ تُحمَّل، فحالةٌ تُغيَّر ولا
   * تبقى أسوأُ من حالةٍ واحدةٍ لا تُغيَّر.
   *
   * و`isOpen` بعدها للدُرج في الجوّال وحدَه — ومحتوى الشريط واحدٌ في الموضعين،
   * مفتوحاً في كليهما.
   */
  const sidebarContent = (
    <div className="bg-white dark:bg-[#0A0A0A] flex flex-col h-full border-l border-slate-200 dark:border-slate-800/80 shadow-sm relative">

      {/* Header / Logo */}
      <div className="flex items-center justify-start px-5 h-14 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="w-full h-full flex items-center py-2 relative pr-1">
          <ZadLogo isOpen={true} className="h-7 w-auto" />
        </div>
      </div>

      {/* Mobile Close Button */}
      <div className="lg:hidden absolute top-5 left-5 z-50">
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-md transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-0.5 flex flex-col relative">
        {mainItems.length > 0 && (
          <div className="flex items-center justify-between px-2 mb-1.5 mt-1">
            <span className="text-[11px] font-semibold text-slate-400/80 dark:text-slate-500 uppercase tracking-widest">الرئيسية</span>
          </div>
        )}

        {mainItems.map((item: any) => {
          const decodedHref = decodeURIComponent(item.href);
          const isActive = item.exact
            ? activePath === decodedHref
            : activePath.startsWith(decodedHref);

          return (
            <NavItem
              key={item.id}
              item={item}
              isActive={isActive}
              isOpen={true}
              onClick={() => handleLinkClick(item.href)}
            />
          )
        })}

        {subItems.length > 0 && (
          <div className="flex items-center justify-between px-2 mt-5 mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400/80 dark:text-slate-500 uppercase tracking-wider">التبويبات الفرعية</span>
          </div>
        )}

        {subItems.map((item: any) => {
          const decodedHref = decodeURIComponent(item.href);
          const isActive = item.exact
            ? activePath === decodedHref
            : activePath.startsWith(decodedHref);

          return (
            <NavItem
              key={item.id}
              item={item}
              isActive={isActive}
              isOpen={true}
              onClick={() => handleLinkClick(item.href)}
            />
          )
        })}
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col shrink-0 px-3 py-3 border-t border-slate-100 dark:border-slate-800 gap-1">
        {/* Privacy Policy Button */}
        <button
          onClick={() => setIsPrivacyModalOpen(true)}
          className="flex items-center justify-start px-3 w-full py-2 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-primary dark:hover:text-primary rounded-lg text-[15px] font-medium transition-all group"
        >
          <ShieldCheck className="w-4 h-4 shrink-0 transition-colors ml-3 text-slate-400 group-hover:text-primary" />
          <span className="whitespace-nowrap text-[13px]">سياسة الخصوصية</span>
        </button>

        {!isCharityUser && (
          <Link
            href="/main"
            className="flex items-center justify-start px-3 w-full py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg text-[15px] font-medium transition-all group"
          >
            <ArrowLeft className="w-4 h-4 shrink-0 transition-colors ml-3 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300" />
            <span className="whitespace-nowrap">العودة للوحة التحكم</span>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      <PrivacyPolicyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
      {/* Desktop Sidebar */}
      {/* الشريطُ ثابتٌ: عرضٌ واحدٌ لا يُطوى، كشريط لوحة زاد. */}
      <aside className="hidden lg:block shrink-0 h-screen w-64 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer.
          `drawerOpen` rather than `isOpen`: the parent starts open so the
          desktop rail renders at full width, which on a phone painted this
          drawer and its backdrop before the parent's effect could close them. */}
      <div className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300 ${drawerOpen ? "visible" : "invisible pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${drawerOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setIsOpen(false)} />
        <div className={`absolute top-0 right-0 h-full w-72 max-w-[85vw] transform transition-transform duration-300 ease-in-out bg-white dark:bg-slate-800 shadow-2xl ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}>
          {sidebarContent}
        </div>
      </div>

    </>
  );
}
