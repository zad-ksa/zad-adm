import Link from "next/link";
import { 
  ArrowLeft, 
  Target, 
  Eye, 
  Lightbulb, 
  Award, 
  Handshake, 
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Star
} from "lucide-react";
import ZadLogo from "@/components/ZadLogo";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "زاد التنموية",
  description: "الشريك الاستراتيجي الموثوق لتمكين وتطوير القطاع غير الربحي",
};

import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    if (session.userType === "CHARITY_USER") {
      redirect("/charity-client");
    } else {
      redirect("/main");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-primary/20">
      {/* Shared Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="w-24 md:w-32 block">
              <ZadLogo isOpen={true} />
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link href="#intro" className="hover:text-primary transition-colors">الرئيسية</Link>
            <Link href="#about" className="hover:text-primary transition-colors">من نحن</Link>
            <Link href="#vision" className="hover:text-primary transition-colors">رؤيتنا</Link>
            <Link href="#values" className="hover:text-primary transition-colors">قيمنا</Link>
            <Link href="#contact" className="hover:text-primary transition-colors">تواصل معنا</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/portals" 
              className="flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
            >
              تسجيل الدخول
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1" id="intro">
        
        {/* Page Header */}
        <section className="bg-white py-16 md:py-24 border-b border-slate-100 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary text-sm font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              شريكك الاستراتيجي في القطاع غير الربحي
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.2] mb-6 tracking-tight max-w-4xl mx-auto">
              نقود التحول نحو مؤسسية رائدة <br className="hidden md:block" />
              <span className="text-primary">وأثر مجتمعي مستدام</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto">
              شركة زاد الإدارة التنموية متخصصة في تمكين القطاع غير الربحي من خلال تقديم منظومة متكاملة من الخدمات الإدارية، المالية، والتسويقية.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/portals" 
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 text-base font-medium text-white bg-primary hover:bg-primary/90 rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                تسجيل الدخول
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Link 
                href="#about" 
                className="w-full sm:w-auto flex items-center justify-center px-8 py-3.5 text-base font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors"
              >
                تعرف علينا أكثر
              </Link>
            </div>
          </div>
        </section>

        {/* Introduction & Who We Are */}
        <section id="about" className="py-20 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-16">
              
              {/* Intro */}
              <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <span className="w-2 h-8 bg-primary rounded-full block"></span>
                  مقدمة
                </h2>
                <div className="space-y-4 text-slate-700 leading-relaxed text-lg">
                  <p>
                    في ظل التحولات الاستراتيجية الكبرى التي تشهدها المملكة العربية السعودية، وانطلاقاً من مستهدفات رؤية ٢٠٣٠م الطموحة لتمكين القطاع الثالث وتحويله من الرعوية إلى التنموية المستدامة؛ تبرز شركة زاد الإدارة التنموية كشريك استراتيجي رائد يمتلك الرؤية والأدوات لقيادة هذا التغيير.
                  </p>
                  <p>
                    نحن نؤمن بأهمية القطاع غير الربحي في وطننا الغالي، ولذلك سخرنا خبراتنا العميقة لتقديم حلول تشغيلية وتسويقية وإدارية وتقنية متكاملة تتجاوز الممارسات التقليدية، لتصل بالمنظمات إلى آفاق من الكفاءة المؤسسية والتميز التشغيلي.
                  </p>
                  <p>
                    تستمد "زاد الإدارة" فلسفتها من عمق الحاجة لتطوير بنية تحتية إدارية صلبة وخدمات ذات جودة عالية للمؤسسات والجمعيات الأهلية، إننا لا نكتفي بتقديم الاستشارات؛ بل نصمم رحلة متكاملة تبدأ من رسم الاستراتيجيات وتنتهي بقياس الأثر الاجتماعي والمالي، مستندين في ذلك إلى كوادر وطنية مؤهلة تفهم خصوصية البيئة المحلية وتستبق تحدياتها.
                  </p>
                </div>
              </div>

              {/* Who We Are */}
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-6 text-center">من نحن؟</h2>
                <p className="text-xl text-center text-slate-600 leading-relaxed bg-white p-8 rounded-3xl border border-primary/10 relative shadow-sm">
                  <span className="absolute -top-4 -right-4 text-6xl text-primary/10 font-serif">"</span>
                  شركة زاد الإدارة التنموية متخصصة في تمكين القطاع غير الربحي من خلال تقديم منظومة متكاملة من الخدمات التي تشمل التخطيط المؤسسي باللوائح والسياسات ونماذج الحوكمة وخدمات التسويق، والابتكار، والخدمات المالية، وصناعة المبادرات وإعداد المشاريع، بما يسهم في رفع كفاءة الجمعيات وتعزيز قدراتها التنافسية، وتخفيف الأعباء التشغيلية والإدارية عن كاهلها مما يتيح لها التركيز على أهدافها الاستراتيجية وتحقيق استدامة الأثر المجتمعي بما يتواكب مع مستهدفات رؤية المملكة ٢٠٣٠م.
                  <span className="absolute -bottom-10 -left-4 text-6xl text-primary/10 font-serif">"</span>
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* Vision & Mission */}
        <section id="vision" className="py-20 bg-primary text-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              
              <div className="bg-white/10 p-10 rounded-3xl border border-white/20 backdrop-blur-sm shadow-xl">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 text-white">
                  <Eye className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">رؤيتنا</h3>
                <p className="text-primary-foreground/90 leading-relaxed text-lg">
                  أن نكون الشريك الاستراتيجي الأول والموثوق في تمكين المنظمات غير الربحية لنقود التحول نحو مؤسسية رائدة وأثر مجتمعي مستدام.
                </p>
              </div>

              <div className="bg-white/10 p-10 rounded-3xl border border-white/20 backdrop-blur-sm shadow-xl">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 text-white">
                  <Target className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">رسالتنا</h3>
                <p className="text-primary-foreground/90 leading-relaxed text-lg">
                  تقديم حلول وخدمات مشتركة مبتكرة تتسم بالجودة العالية، لمساندة الجمعيات في تحقيق أهدافها بكفاءة واحترافية وتعظيم أثرها التنموي من خلال تبني أفضل الممارسات والمنهجيات العالمية.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* Values */}
        <section id="values" className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">قيمنا</h2>
              <p className="text-slate-600 text-lg">مبادئ راسخة تقودنا نحو التميز والإتقان</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 text-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                  <Lightbulb className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">الابتكار</h3>
                <p className="text-slate-600 text-sm">تقديم حلول إبداعية تتجاوز التوقعات التقليدية.</p>
              </div>
              
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 text-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">الجودة</h3>
                <p className="text-slate-600 text-sm">الالتزام بأعلى معايير الإتقان والتميز.</p>
              </div>

              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 text-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">الالتزام</h3>
                <p className="text-slate-600 text-sm">الوضوح التام في كافة التعاملات والتقارير.</p>
              </div>

              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 text-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                  <Handshake className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">الشراكة</h3>
                <p className="text-slate-600 text-sm">بناء علاقات تكاملية مستدامة مع عملائنا.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Goals & What Sets Us Apart */}
        <section className="py-24 bg-slate-50 border-t border-slate-100">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
              
              {/* Goals */}
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                  <Target className="w-8 h-8 text-primary" />
                  أهدافنا
                </h2>
                <ul className="space-y-6">
                  {[
                    "تقديم الخدمات المتكاملة بما يضمن سلاسة الأداء الإداري والمالي للجمعيات الأهلية.",
                    "ابتكار حلول تسويقية واستثمارية تساهم في تنويع وتنمية موارد الجمعيات الأهلية.",
                    "نقل وتطبيق أفضل الممارسات والتقنيات الحديثة لتطوير أعمال القطاع غير الربحي.",
                    "تصميم المشاريع التنموية وفق أعلى معايير الجودة.",
                    "إدارة الأداء الاستراتيجي والتشغيلي للجمعيات الأهلية بما يسهم في تحقيق مستهدفاتها الاستراتيجية."
                  ].map((goal, idx) => (
                    <li key={idx} className="flex gap-4 items-start bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
                        {idx + 1}
                      </div>
                      <p className="text-slate-700 pt-1 font-medium">{goal}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* What Sets Us Apart */}
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                  <Star className="w-8 h-8 text-secondary" />
                  ما يميزنا
                </h2>
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-primary text-xl mb-2">خبرات متخصصة</h4>
                    <p className="text-slate-600 leading-relaxed text-sm">
                      يتكون فريق عملنا من كوادر ذات خبرة عالية في العمل مع القطاع غير الربحي في عدد من المجالات من أبرزها: التخطيط التشغيلي والاستراتيجي، التسويق، الخدمات المالية، تصميم وتنفيذ المشاريع، وأسهموا في تأسيس وإدارة عدد كبير من الجمعيات الأهلية.
                    </p>
                  </div>
                  
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-primary text-xl mb-2">حلول متكاملة</h4>
                    <p className="text-slate-600 leading-relaxed text-sm">
                      نقدم في زاد الإدارة باقة حلول متكاملة تسهم في تغطية الاحتياجات الرئيسية للجمعيات الأهلية وإدارة عملياتها بجودة عالية مثل خدمات التخطيط والتسويق والخدمات المالية والتقنية وتصميم وتنفيذ المشاريع.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-primary text-xl mb-2">أدوات رقمية</h4>
                    <p className="text-slate-600 leading-relaxed text-sm">
                      نحرص على استخدام أدوات رقمية وتقنية بجودة وكفاءة مما يعزز ويدعم جودة تنفيذ الأعمال في أوقات قياسية.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-primary text-xl mb-2">رحلة تشاركية</h4>
                    <p className="text-slate-600 leading-relaxed text-sm">
                      نحرص على إشراك العميل في كافة خطوات ومراحل العمل من خلال التقارير والاجتماعات الدورية وورش العمل والزيارات المتبادلة والتواصل الفعال.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* Shared Footer */}
      <footer id="contact" className="bg-slate-900 text-slate-300 py-16 border-t border-slate-800 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            
            {/* Column 1: About */}
            <div className="space-y-6">
              <div className="w-32 brightness-0 invert opacity-90">
                <ZadLogo isOpen={true} />
              </div>
              <p className="text-sm leading-relaxed text-slate-400">
                الشريك الاستراتيجي الأول والموثوق في تمكين المنظمات غير الربحية لنقود التحول نحو مؤسسية رائدة وأثر مجتمعي مستدام.
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 className="text-white font-bold text-lg mb-6">روابط سريعة</h4>
              <ul className="space-y-3 text-sm">
                <li><Link href="#intro" className="hover:text-white transition-colors">الرئيسية</Link></li>
                <li><Link href="#about" className="hover:text-white transition-colors">من نحن</Link></li>
                <li><Link href="#vision" className="hover:text-white transition-colors">رؤيتنا</Link></li>
                <li><Link href="/portals" className="hover:text-white transition-colors">تسجيل الدخول</Link></li>
                <li><Link href="/privacy-policy" className="hover:text-white transition-colors">سياسة الخصوصية</Link></li>
              </ul>
            </div>

            {/* Column 3: Contact */}
            <div className="lg:col-span-2">
              <h4 className="text-white font-bold text-lg mb-6">تواصل معنا</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-500 shrink-0" />
                  <span>المملكة العربية السعودية<br/>جدة - أبرق الرغامة</span>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-slate-500 shrink-0" />
                    <span dir="ltr">+966 55 549 3583</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-500 shrink-0" />
                    <span dir="ltr">zad.adm.ksa@gmail.com</span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>جميع الحقوق محفوظة لشركة زاد التنموية © {new Date().getFullYear()}</p>
            <div className="flex gap-4">
              <Link href="/privacy-policy" className="hover:text-white transition-colors">سياسة الخصوصية</Link>
              <Link href="#" className="hover:text-white transition-colors">الشروط والأحكام</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
