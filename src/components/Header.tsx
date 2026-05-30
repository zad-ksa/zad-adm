import Image from "next/image";
import Link from "next/link";

interface HeaderProps {
  disableLink?: boolean;
  title?: string;
}

export default function Header({ disableLink = false, title = "استبيان الجاهزية" }: HeaderProps) {
  const logoContent = (
    <div className={`flex items-center gap-3 ${disableLink ? "" : "group"}`}>
      <div className={`relative w-16 h-16 sm:w-20 sm:h-20 transition-transform duration-300 ${disableLink ? "" : "group-hover:scale-105"}`}>
        <Image
          src="/assets/logos/لوجو زاد-09.png"
          alt="زاد التنموية"
          fill
          className="object-contain"
          priority
        />
      </div>
      <div className="hidden sm:block">
        <h1 className="font-bold text-xl text-primary leading-tight">زاد التنموية</h1>
        <p className="text-sm text-slate-500">لأثر مستدام</p>
      </div>
    </div>
  );

  return (
    <header className="w-full bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        {disableLink ? (
          logoContent
        ) : (
          <Link href="/" className="block">
            {logoContent}
          </Link>
        )}
        <div className="flex items-center">
          <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold border border-primary/20">
            {title}
          </span>
        </div>
      </div>
    </header>
  );
}
