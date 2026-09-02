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
  Star,
} from "lucide-react";
import ZadLogo from "@/components/ZadLogo";
import SectionShell from "@/components/landing/SectionShell";
import { LANDING_FONT_VARS_CLASSNAME, landingFontStack } from "@/app/landingFonts";
import {
  DEFAULT_CONTENT,
  type LandingConfig,
  type LinkItem,
  type SectionConfig,
  type SectionKey,
  type TitledItem,
} from "@/lib/landing";

const VALUE_ICONS = [Lightbulb, Award, CheckCircle2, Handshake];

function sec(config: LandingConfig, key: SectionKey): SectionConfig {
  return config.sections[key];
}

/** يقرأ حقلاً من محتوى الفقرة مع رجوع للافتراضي عند الغياب. */
function field<T>(content: Record<string, unknown>, key: SectionKey, name: string): T {
  const v = content[name];
  if (v === undefined || v === null) {
    return DEFAULT_CONTENT[key][name] as T;
  }
  return v as T;
}

/** قراءة حقل قائمة مع ضمان أنه مصفوفة — يحمي الصفحة العامة من إعداد تالف. */
function listField<T>(content: Record<string, unknown>, key: SectionKey, name: string): T[] {
  const v = field<unknown>(content, key, name);
  if (Array.isArray(v)) return v as T[];
  const fallback = DEFAULT_CONTENT[key][name];
  return Array.isArray(fallback) ? (fallback as T[]) : [];
}

/**
 * ألوان الأسطح/النصوص الافتراضية لكل الفقرات، حسب ثيم الواجهة. لا تُبنى على متغيّر
 * Tailwind `dark:` عمداً: الصفحة العامة قد تحمل `html.dark` من نظام الزائر، بينما
 * هذا الاختيار يخصّ المسؤول ويجب أن يكون قاطعاً. تخصيص خلفية/نص فقرة على حدة يبقى
 * فوق هذه القيم (SectionShell + قواعد [data-ls-*] بأولوية !important).
 */
function palette(dark: boolean) {
  return {
    page: dark ? "bg-slate-950" : "bg-slate-50",
    headerBar: dark
      ? "border-slate-800 bg-slate-950/80"
      : "border-slate-200 bg-white/80",
    navText: dark ? "text-slate-300" : "text-slate-600",
    heroShell: dark ? "bg-slate-950 border-slate-800" : "bg-white border-slate-100",
    surfaceMuted: dark ? "bg-slate-950" : "bg-slate-50",
    card: dark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100",
    cardMuted: dark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-100",
    heading: dark ? "text-slate-100" : "text-slate-900",
    body: dark ? "text-slate-300" : "text-slate-600",
    bodyStrong: dark ? "text-slate-200" : "text-slate-700",
    secondaryCta: dark
      ? "text-slate-100 bg-slate-900 hover:bg-slate-800 border-slate-700"
      : "text-slate-700 bg-white hover:bg-slate-50 border-slate-200",
  };
}

/**
 * عرض الواجهة الرئيسية بالكامل من الإعداد. مكوّن عرض صِرف بلا "use client"
 * وبلا جلب بيانات — يُستدعى من الصفحة العامة ومن صفحة المعاينة الحية.
 */
export default function LandingView({ config }: { config: LandingConfig }) {
  const dark = config.theme === "dark";
  const P = palette(dark);

  const navbar = sec(config, "navbar");
  const hero = sec(config, "hero");
  const intro = sec(config, "intro");
  const whoweare = sec(config, "whoweare");
  const vm = sec(config, "visionmission");
  const values = sec(config, "values");
  const gf = sec(config, "goalsfeatures");
  const footer = sec(config, "footer");

  const navLinks = listField<LinkItem>(navbar.content, "navbar", "links");

  return (
    <div
      className={`min-h-screen ${P.page} flex flex-col selection:bg-primary/20 ${LANDING_FONT_VARS_CLASSNAME} ${dark ? "dark" : ""}`}
      style={{ fontFamily: landingFontStack(config.fontFamily) }}
      dir="rtl"
      data-landing-theme={config.theme}
    >
      {/* الشريط العلوي */}
      {navbar.enabled && (
        <header className={`sticky top-0 z-50 w-full border-b ${P.headerBar} backdrop-blur-md`}>
          <SectionShell style={navbar.style} className="overflow-hidden">
            <div className="container mx-auto px-4 h-20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link href="/" className="w-24 md:w-32 block">
                  <ZadLogo isOpen={true} />
                </Link>
              </div>

              <nav className={`hidden md:flex items-center gap-8 text-sm font-medium ${P.navText}`}>
                {navLinks.map((l, i) => (
                  <Link key={i} href={l.href} className="hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-4">
                <Link
                  href="/portals"
                  className="flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
                >
                  {field<string>(navbar.content, "navbar", "loginLabel")}
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Link>
              </div>
            </div>
          </SectionShell>
        </header>
      )}

      <main className="flex-1" id="intro">
        {/* الواجهة (Hero) */}
        {hero.enabled && (
          <section className="relative">
            <SectionShell
              style={hero.style}
              className={`${P.heroShell} py-16 md:py-24 border-b text-center overflow-hidden`}
            >
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

              <div className="container mx-auto px-4 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary text-sm font-medium mb-8">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  {field<string>(hero.content, "hero", "badge")}
                </div>

                <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold ${P.heading} leading-[1.2] mb-6 tracking-tight max-w-4xl mx-auto`}>
                  {field<string>(hero.content, "hero", "titleLine1")} <br className="hidden md:block" />
                  <span className="text-primary">{field<string>(hero.content, "hero", "titleLine2")}</span>
                </h1>

                <p className={`text-lg md:text-xl ${P.body} mb-10 leading-relaxed max-w-2xl mx-auto`}>
                  {field<string>(hero.content, "hero", "subtitle")}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/portals"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 text-base font-medium text-white bg-primary hover:bg-primary/90 rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                  >
                    {field<string>(hero.content, "hero", "primaryCtaLabel")}
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                  <Link
                    href="#about"
                    className={`w-full sm:w-auto flex items-center justify-center px-8 py-3.5 text-base font-medium border rounded-xl transition-colors ${P.secondaryCta}`}
                  >
                    {field<string>(hero.content, "hero", "secondaryCtaLabel")}
                  </Link>
                </div>
              </div>
            </SectionShell>
          </section>
        )}

        {/* مقدمة + من نحن */}
        {(intro.enabled || whoweare.enabled) && (
          <section id="about" className="relative">
            <SectionShell style={intro.style} className={`py-20 ${P.surfaceMuted} overflow-hidden`}>
              <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto space-y-16">
                  {intro.enabled && (
                    <div className={`${P.card} border p-8 md:p-12 rounded-3xl shadow-sm`}>
                      <h2 className={`text-2xl font-bold ${P.heading} mb-6 flex items-center gap-3`}>
                        <span className="w-2 h-8 bg-primary rounded-full block"></span>
                        {field<string>(intro.content, "intro", "title")}
                      </h2>
                      <div className={`space-y-4 ${P.bodyStrong} leading-relaxed text-lg`}>
                        {listField<string>(intro.content, "intro", "paragraphs").map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {whoweare.enabled && (
                    <div>
                      <h2 className={`text-3xl font-bold ${P.heading} mb-6 text-center`}>
                        {field<string>(whoweare.content, "whoweare", "title")}
                      </h2>
                      <p className={`text-xl text-center ${P.body} leading-relaxed ${P.card} p-8 rounded-3xl border relative shadow-sm`}>
                        <span className="absolute -top-4 -right-4 text-6xl text-primary/10 font-serif">&quot;</span>
                        {field<string>(whoweare.content, "whoweare", "body")}
                        <span className="absolute -bottom-10 -left-4 text-6xl text-primary/10 font-serif">&quot;</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </SectionShell>
          </section>
        )}

        {/* الرؤية والرسالة */}
        {vm.enabled && (
          <section id="vision" className="relative">
            <SectionShell style={vm.style} className="py-20 bg-primary text-white overflow-hidden">
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                  <div className="bg-white/10 p-10 rounded-3xl border border-white/20 backdrop-blur-sm shadow-xl">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 text-white">
                      <Eye className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{field<string>(vm.content, "visionmission", "visionTitle")}</h3>
                    <p className="text-primary-foreground/90 leading-relaxed text-lg">
                      {field<string>(vm.content, "visionmission", "visionBody")}
                    </p>
                  </div>

                  <div className="bg-white/10 p-10 rounded-3xl border border-white/20 backdrop-blur-sm shadow-xl">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 text-white">
                      <Target className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{field<string>(vm.content, "visionmission", "missionTitle")}</h3>
                    <p className="text-primary-foreground/90 leading-relaxed text-lg">
                      {field<string>(vm.content, "visionmission", "missionBody")}
                    </p>
                  </div>
                </div>
              </div>
            </SectionShell>
          </section>
        )}

        {/* قيمنا */}
        {values.enabled && (
          <section id="values" className="relative">
            <SectionShell style={values.style} className={`py-24 ${dark ? "bg-slate-950" : "bg-white"} overflow-hidden`}>
              <div className="container mx-auto px-4">
                <div className="text-center max-w-2xl mx-auto mb-16">
                  <h2 className={`text-3xl font-bold ${P.heading} mb-4`}>{field<string>(values.content, "values", "title")}</h2>
                  <p className={`${P.body} text-lg`}>{field<string>(values.content, "values", "subtitle")}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                  {listField<TitledItem>(values.content, "values", "items").map((item, idx) => {
                    const Icon = VALUE_ICONS[idx % VALUE_ICONS.length];
                    return (
                      <div
                        key={idx}
                        className={`${P.cardMuted} border p-8 rounded-3xl text-center hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}
                      >
                        <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                          <Icon className="w-8 h-8" />
                        </div>
                        <h3 className={`text-xl font-bold ${P.heading} mb-3`}>{item.title}</h3>
                        <p className={`${P.body} text-sm`}>{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionShell>
          </section>
        )}

        {/* الأهداف وما يميزنا */}
        {gf.enabled && (
          <section className="relative">
            <SectionShell style={gf.style} className={`py-24 ${P.surfaceMuted} border-t ${dark ? "border-slate-800" : "border-slate-100"} overflow-hidden`}>
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
                  <div>
                    <h2 className={`text-3xl font-bold ${P.heading} mb-8 flex items-center gap-3`}>
                      <Target className="w-8 h-8 text-primary" />
                      {field<string>(gf.content, "goalsfeatures", "goalsTitle")}
                    </h2>
                    <ul className="space-y-6">
                      {listField<string>(gf.content, "goalsfeatures", "goals").map((goal, idx) => (
                        <li
                          key={idx}
                          className={`flex gap-4 items-start ${P.card} border p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow`}
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
                            {idx + 1}
                          </div>
                          <p className={`${P.bodyStrong} pt-1 font-medium`}>{goal}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h2 className={`text-3xl font-bold ${P.heading} mb-8 flex items-center gap-3`}>
                      <Star className="w-8 h-8 text-secondary" />
                      {field<string>(gf.content, "goalsfeatures", "featuresTitle")}
                    </h2>
                    <div className="space-y-6">
                      {listField<TitledItem>(gf.content, "goalsfeatures", "features").map((f, idx) => (
                        <div
                          key={idx}
                          className={`${P.card} border p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow`}
                        >
                          <h4 className="font-bold text-primary text-xl mb-2">{f.title}</h4>
                          <p className={`${P.body} leading-relaxed text-sm`}>{f.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </SectionShell>
          </section>
        )}
      </main>

      {/* التذييل */}
      {footer.enabled && (
        <footer id="contact" className="relative bg-slate-900 text-slate-300 mt-auto">
          <SectionShell style={footer.style} className="py-16 border-t border-slate-800 overflow-hidden">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                <div className="space-y-6">
                  <div className="w-32 brightness-0 invert opacity-90">
                    <ZadLogo isOpen={true} />
                  </div>
                  <p className="text-sm leading-relaxed text-slate-400">
                    {field<string>(footer.content, "footer", "about")}
                  </p>
                </div>

                <div>
                  <h4 className="text-white font-bold text-lg mb-6">
                    {field<string>(footer.content, "footer", "quickLinksTitle")}
                  </h4>
                  <ul className="space-y-3 text-sm">
                    {listField<LinkItem>(footer.content, "footer", "quickLinks").map((l, i) => (
                      <li key={i}>
                        <Link href={l.href} className="hover:text-white transition-colors">
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lg:col-span-2">
                  <h4 className="text-white font-bold text-lg mb-6">
                    {field<string>(footer.content, "footer", "contactTitle")}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-slate-500 shrink-0" />
                      <span className="whitespace-pre-line">{field<string>(footer.content, "footer", "address")}</span>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-slate-500 shrink-0" />
                        <span dir="ltr">{field<string>(footer.content, "footer", "phone")}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-slate-500 shrink-0" />
                        <span dir="ltr">{field<string>(footer.content, "footer", "email")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
                <p>
                  {field<string>(footer.content, "footer", "copyright")} © {new Date().getFullYear()}
                </p>
                <div className="flex gap-4">
                  {listField<LinkItem>(footer.content, "footer", "bottomLinks").map((l, i) => (
                    <Link key={i} href={l.href} className="hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </SectionShell>
        </footer>
      )}
    </div>
  );
}
