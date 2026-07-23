import { Shield, BookOpen, AlertCircle, Scale, Building, Landmark, ChevronLeft, CheckCircle2, TrendingUp, Gem } from "lucide-react";
import Link from "next/link";
import { CharitySize } from "@/data/governanceManual";
import AutoRedirectCharitySize from "@/components/AutoRedirectCharitySize";

export default async function GovernancePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const charityName = decodeURIComponent(name);

  const sizes = [
    {
      id: "MICRO",
      title: "الجمعيات متناهية الصغر",
      desc: "إجمالي المصروفات السنوية لا يتجاوز 500 ألف ريال سعودي.",
      icon: <Building className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors" />,
      features: ["معيار الامتثال والالتزام الأساسي", "مؤشرات الشفافية المبسطة"]
    },
    {
      id: "SMALL",
      title: "الجمعيات الصغيرة",
      desc: "إجمالي المصروفات من 500 ألف إلى 2 مليون ريال سعودي.",
      icon: <Building className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors" />,
      features: ["الامتثال والالتزام الأساسي", "الشفافية المبسطة"]
    },
    {
      id: "MEDIUM",
      title: "الجمعيات المتوسطة",
      desc: "إجمالي المصروفات من 2 مليون إلى 8 مليون ريال سعودي.",
      icon: <Landmark className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors" />,
      features: ["معيار السلامة المالية", "سياسات حوكمة متقدمة"]
    },
    {
      id: "LARGE",
      title: "الجمعيات الكبيرة",
      desc: "إجمالي المصروفات من 8 مليون إلى 30 مليون ريال سعودي.",
      icon: <TrendingUp className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors" />,
      features: ["مراجعة داخلية مستقلة إلزامية", "لجان منبثقة (مراجعة، مكافآت)"]
    },
    {
      id: "MEGA",
      title: "الجمعيات متناهية الكبر",
      desc: "إجمالي المصروفات يتجاوز 30 مليون ريال سعودي.",
      icon: <Gem className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors" />,
      features: ["حوكمة مؤسسية شاملة", "تدقيق مالي عالي المستوى"]
    }
  ];

  return (
    <div className="min-h-full bg-[#FAFAFA] dark:bg-[#0A0A0A] p-4 md:p-8 selection:bg-primary/20 selection:text-primary">
      <AutoRedirectCharitySize charityName={charityName} />
      
      {/* Header Section */}
      <div className="mb-10 max-w-6xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 text-primary">
          <Scale className="w-4 h-4" />
          <span className="text-xs font-semibold tracking-widest uppercase">المركز الوطني لتنمية القطاع غير الربحي</span>
        </div>
        <h1 
          className="font-bold text-slate-900 dark:text-white tracking-tight"
          style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.1 }}
        >
          دليل <span className="text-primary">الحوكمة</span> الشامل
        </h1>
        <p 
          className="text-slate-500 dark:text-slate-400 max-w-2xl font-medium"
          style={{ fontSize: "clamp(1rem, 2vw, 1.125rem)", lineHeight: 1.6 }}
        >
          مرجعك الأساسي لفهم معايير الحوكمة، وتصنيف الجمعيات الأهلية، ومتطلبات الامتثال لتحقيق الشفافية والاستدامة المؤسسية.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-6xl mx-auto auto-rows-[minmax(180px,auto)]">
        
        {/* Intro Card - Span 8 */}
        <div className="md:col-span-8 group relative rounded-3xl overflow-hidden bg-white dark:bg-[#111] ring-1 ring-slate-200 dark:ring-slate-800/80 shadow-sm hover:shadow-md transition-all duration-500 flex flex-col justify-between p-8">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none transition-opacity duration-500 opacity-50 group-hover:opacity-100" />
          
          <div className="relative z-10 space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center border border-primary/20 dark:border-primary/30">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">ما هي الحوكمة؟</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
                نظام يحدد من يتخذ القرارات وكيفية اتخاذها، ويضمن وجود هيكل تنظيمي يوزع الأدوار والمسؤوليات بوضوح بين الجمعية العمومية، ومجلس الإدارة، والإدارة التنفيذية، لتحقيق أهداف الجمعية بشفافية ومسؤولية.
              </p>
            </div>
          </div>
        </div>

        {/* Info / Alert Block - Span 4 */}
        <div className="md:col-span-4 relative rounded-3xl overflow-hidden bg-rose-500/5 dark:bg-rose-500/10 ring-1 ring-rose-500/20 shadow-sm p-6 flex items-start gap-4 h-full">
          <div className="shrink-0 mt-1">
            <AlertCircle className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-1.5">تنبيه هام للجمعيات</h4>
            <p className="text-xs text-rose-600/80 dark:text-rose-300/80 leading-relaxed">
              عدم تحقيق درجة اجتياز الحوكمة قد يعرض الجمعية لإيقاف الدعم الحكومي وتجميد الحسابات البنكية. احرص على تحديث بياناتك بانتظام في منصة المركز.
            </p>
          </div>
        </div>

        {/* Charity Sizes Cards */}
        {sizes.map((size) => (
          <Link 
            key={size.id}
            href={`/portal/${encodeURIComponent(charityName)}/governance/standards?size=${size.id}`}
            className="md:col-span-4 relative rounded-3xl overflow-hidden bg-white dark:bg-[#111] ring-1 ring-slate-200 dark:ring-slate-800/80 shadow-sm hover:shadow-md hover:ring-primary/40 dark:hover:ring-primary/50 transition-all duration-300 p-6 flex flex-col gap-4 group cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="flex items-start justify-between relative z-10">
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all duration-300">
                {size.icon}
              </div>
              <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:-translate-x-1 transition-all duration-300" />
            </div>

            <div className="relative z-10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{size.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4 min-h-[32px]">
                {size.desc}
              </p>
              <ul className="space-y-2">
                {size.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> {feature}
                  </li>
                ))}
              </ul>
            </div>
          </Link>
        ))}



      </div>
    </div>
  );
}
