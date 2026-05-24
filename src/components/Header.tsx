import Image from "next/image";
import Link from "next/link";

interface HeaderProps {
  disableLink?: boolean;
  title?: string;
  isDark?: boolean;
}

export default function Header({ disableLink = false, title = "استبيان الجاهزية", isDark = false }: HeaderProps) {
  const logoContent = (
    <div className={`flex items-center gap-3 ${disableLink ? "" : "group"}`}>
      <div className={`relative w-16 h-16 sm:w-20 sm:h-20 transition-transform duration-300 ${disableLink ? "" : "group-hover:scale-105"}`}>
        <Image
          src="/assets/logos/لوجو زاد-09.png"
          alt="زاد التنموية"
          fill
          className={`object-contain ${isDark ? "brightness-[100] drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" : ""}`}
          priority
        />
      </div>
      <div className="hidden sm:block">
        <h1 className={`font-bold text-xl leading-tight ${isDark ? "text-white" : "text-primary"}`}>زاد التنموية</h1>
        <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>لأثر مستدام</p>
      </div>
    </div>
  );

  return (
    <header className={`w-full shadow-sm border-b transition-colors ${isDark ? "bg-[#212529] border-[#32383e]" : "bg-white border-slate-200"}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        {disableLink ? (
          logoContent
        ) : (
          <Link href="/" className="block">
            {logoContent}
          </Link>
        )}
        <div className="flex items-center">
          <span className={`${isDark ? "bg-primary/20 text-primary-300 border-primary/30" : "bg-primary/10 text-primary border-primary/20"} px-4 py-1.5 rounded-full text-sm font-semibold border`}>
            {title}
          </span>
        </div>
      </div>
    </header>
  );
}
