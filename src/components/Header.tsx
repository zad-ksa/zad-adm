import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/assets/logos/لوجو زاد-01.png"
              alt="شركة زاد"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-xl text-primary leading-tight">شركة زاد</h1>
            <p className="text-sm text-slate-500">للجمعيات الخيرية</p>
          </div>
        </Link>
        <div className="flex items-center">
          <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold border border-primary/20">
            استبيان الجاهزية
          </span>
        </div>
      </div>
    </header>
  );
}
