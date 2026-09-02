/**
 * نموذج بيانات «التحكم في الواجهة الرئيسية».
 *
 * الصفحة العامة (src/app/page.tsx) كانت JSX ثابتاً بالكامل. صار محتواها ومظهرها
 * يُقرآن من هنا: الافتراضات أدناه تعيد إنتاج الشكل الأصلي حرفياً، وأي تعديل يحفظه
 * فريق زاد في GlobalSetting بمفتاح LANDING_PAGE يُدمَج فوقها.
 *
 * لا شيء في هذا الملف يعتمد على الخادم — يُستورد من مكوّن خادم (page.tsx) ومن
 * مكوّن عميل (المعاينة) على حد سواء.
 */

/** نوع رسالة postMessage بين المحرّر وإطار المعاينة الحية. */
export const LANDING_PREVIEW_MESSAGE = "zad-landing-preview";

export type SectionKey =
  | "navbar"
  | "hero"
  | "intro"
  | "whoweare"
  | "visionmission"
  | "values"
  | "goalsfeatures"
  | "footer";

export const SECTION_ORDER: SectionKey[] = [
  "navbar",
  "hero",
  "intro",
  "whoweare",
  "visionmission",
  "values",
  "goalsfeatures",
  "footer",
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  navbar: "الشريط العلوي",
  hero: "الواجهة (Hero)",
  intro: "مقدمة",
  whoweare: "من نحن",
  visionmission: "الرؤية والرسالة",
  values: "قيمنا",
  goalsfeatures: "الأهداف وما يميزنا",
  footer: "التذييل (Footer)",
};

export type BackgroundType = "none" | "solid" | "gradient" | "image";

export type AnimationType =
  | "none"
  | "gradient-shift"
  | "aurora"
  | "floating-blobs"
  | "drifting-dots";

export const ANIMATION_LABELS: Record<AnimationType, string> = {
  "none": "بدون",
  "gradient-shift": "تدرّج متحرك",
  "aurora": "أضواء شمالية",
  "floating-blobs": "فقاعات طافية",
  "drifting-dots": "نقاط منجرفة",
};

export interface GradientConfig {
  from: string;
  to: string;
  angle: number; // درجات
}

export interface ImageBgConfig {
  url: string;
  publicId?: string;
  opacity: number; // 0..1
  overlayColor: string;
  overlayOpacity: number; // 0..1
  blur: number; // px
}

export interface AnimationConfig {
  type: AnimationType;
  speed: number; // ثوانٍ لدورة كاملة (أكبر = أبطأ)
  colorA: string;
  colorB: string;
}

export interface BackgroundStyle {
  type: BackgroundType;
  color: string;
  gradient: GradientConfig;
  image: ImageBgConfig | null;
  animation: AnimationConfig;
}

export interface TextStyle {
  headingColor: string | null;
  bodyColor: string | null;
  headingScale: number; // مضاعف، 1 = الافتراضي
  bodyScale: number;
  align: "right" | "center" | "left" | null;
}

export interface SectionStyle {
  background: BackgroundStyle;
  text: TextStyle;
}

export interface SectionConfig {
  enabled: boolean;
  content: Record<string, unknown>;
  style: SectionStyle;
}

export interface LandingConfig {
  sections: Record<SectionKey, SectionConfig>;
}

export interface LinkItem {
  label: string;
  href: string;
}

export interface TitledItem {
  title: string;
  description: string;
}

// ── الأنماط الافتراضية ────────────────────────────────────────────────────────

function defaultStyle(): SectionStyle {
  return {
    background: {
      type: "none",
      color: "#0f766e",
      gradient: { from: "#0f766e", to: "#ca8a04", angle: 135 },
      image: null,
      animation: { type: "none", speed: 18, colorA: "#0f766e", colorB: "#ca8a04" },
    },
    text: {
      headingColor: null,
      bodyColor: null,
      headingScale: 1,
      bodyScale: 1,
      align: null,
    },
  };
}

// ── المحتوى الافتراضي (منقول حرفياً من page.tsx الأصلية) ───────────────────────

export const DEFAULT_CONTENT: Record<SectionKey, Record<string, unknown>> = {
  navbar: {
    links: [
      { label: "الرئيسية", href: "#intro" },
      { label: "من نحن", href: "#about" },
      { label: "رؤيتنا", href: "#vision" },
      { label: "قيمنا", href: "#values" },
      { label: "تواصل معنا", href: "#contact" },
    ] as LinkItem[],
    loginLabel: "تسجيل الدخول",
  },
  hero: {
    badge: "شريكك الاستراتيجي في القطاع غير الربحي",
    titleLine1: "نقود التحول نحو مؤسسية رائدة",
    titleLine2: "وأثر مجتمعي مستدام",
    subtitle:
      "شركة زاد الإدارة التنموية متخصصة في تمكين القطاع غير الربحي من خلال تقديم منظومة متكاملة من الخدمات الإدارية، المالية، والتسويقية.",
    primaryCtaLabel: "تسجيل الدخول",
    secondaryCtaLabel: "تعرف علينا أكثر",
  },
  intro: {
    title: "مقدمة",
    paragraphs: [
      "في ظل التحولات الاستراتيجية الكبرى التي تشهدها المملكة العربية السعودية، وانطلاقاً من مستهدفات رؤية ٢٠٣٠م الطموحة لتمكين القطاع الثالث وتحويله من الرعوية إلى التنموية المستدامة؛ تبرز شركة زاد الإدارة التنموية كشريك استراتيجي رائد يمتلك الرؤية والأدوات لقيادة هذا التغيير.",
      "نحن نؤمن بأهمية القطاع غير الربحي في وطننا الغالي، ولذلك سخرنا خبراتنا العميقة لتقديم حلول تشغيلية وتسويقية وإدارية وتقنية متكاملة تتجاوز الممارسات التقليدية، لتصل بالمنظمات إلى آفاق من الكفاءة المؤسسية والتميز التشغيلي.",
      "تستمد \"زاد الإدارة\" فلسفتها من عمق الحاجة لتطوير بنية تحتية إدارية صلبة وخدمات ذات جودة عالية للمؤسسات والجمعيات الأهلية، إننا لا نكتفي بتقديم الاستشارات؛ بل نصمم رحلة متكاملة تبدأ من رسم الاستراتيجيات وتنتهي بقياس الأثر الاجتماعي والمالي، مستندين في ذلك إلى كوادر وطنية مؤهلة تفهم خصوصية البيئة المحلية وتستبق تحدياتها.",
    ] as string[],
  },
  whoweare: {
    title: "من نحن؟",
    body: "شركة زاد الإدارة التنموية متخصصة في تمكين القطاع غير الربحي من خلال تقديم منظومة متكاملة من الخدمات التي تشمل التخطيط المؤسسي باللوائح والسياسات ونماذج الحوكمة وخدمات التسويق، والابتكار، والخدمات المالية، وصناعة المبادرات وإعداد المشاريع، بما يسهم في رفع كفاءة الجمعيات وتعزيز قدراتها التنافسية، وتخفيف الأعباء التشغيلية والإدارية عن كاهلها مما يتيح لها التركيز على أهدافها الاستراتيجية وتحقيق استدامة الأثر المجتمعي بما يتواكب مع مستهدفات رؤية المملكة ٢٠٣٠م.",
  },
  visionmission: {
    visionTitle: "رؤيتنا",
    visionBody:
      "أن نكون الشريك الاستراتيجي الأول والموثوق في تمكين المنظمات غير الربحية لنقود التحول نحو مؤسسية رائدة وأثر مجتمعي مستدام.",
    missionTitle: "رسالتنا",
    missionBody:
      "تقديم حلول وخدمات مشتركة مبتكرة تتسم بالجودة العالية، لمساندة الجمعيات في تحقيق أهدافها بكفاءة واحترافية وتعظيم أثرها التنموي من خلال تبني أفضل الممارسات والمنهجيات العالمية.",
  },
  values: {
    title: "قيمنا",
    subtitle: "مبادئ راسخة تقودنا نحو التميز والإتقان",
    items: [
      { title: "الابتكار", description: "تقديم حلول إبداعية تتجاوز التوقعات التقليدية." },
      { title: "الجودة", description: "الالتزام بأعلى معايير الإتقان والتميز." },
      { title: "الالتزام", description: "الوضوح التام في كافة التعاملات والتقارير." },
      { title: "الشراكة", description: "بناء علاقات تكاملية مستدامة مع عملائنا." },
    ] as TitledItem[],
  },
  goalsfeatures: {
    goalsTitle: "أهدافنا",
    goals: [
      "تقديم الخدمات المتكاملة بما يضمن سلاسة الأداء الإداري والمالي للجمعيات الأهلية.",
      "ابتكار حلول تسويقية واستثمارية تساهم في تنويع وتنمية موارد الجمعيات الأهلية.",
      "نقل وتطبيق أفضل الممارسات والتقنيات الحديثة لتطوير أعمال القطاع غير الربحي.",
      "تصميم المشاريع التنموية وفق أعلى معايير الجودة.",
      "إدارة الأداء الاستراتيجي والتشغيلي للجمعيات الأهلية بما يسهم في تحقيق مستهدفاتها الاستراتيجية.",
    ] as string[],
    featuresTitle: "ما يميزنا",
    features: [
      {
        title: "خبرات متخصصة",
        description:
          "يتكون فريق عملنا من كوادر ذات خبرة عالية في العمل مع القطاع غير الربحي في عدد من المجالات من أبرزها: التخطيط التشغيلي والاستراتيجي، التسويق، الخدمات المالية، تصميم وتنفيذ المشاريع، وأسهموا في تأسيس وإدارة عدد كبير من الجمعيات الأهلية.",
      },
      {
        title: "حلول متكاملة",
        description:
          "نقدم في زاد الإدارة باقة حلول متكاملة تسهم في تغطية الاحتياجات الرئيسية للجمعيات الأهلية وإدارة عملياتها بجودة عالية مثل خدمات التخطيط والتسويق والخدمات المالية والتقنية وتصميم وتنفيذ المشاريع.",
      },
      {
        title: "أدوات رقمية",
        description:
          "نحرص على استخدام أدوات رقمية وتقنية بجودة وكفاءة مما يعزز ويدعم جودة تنفيذ الأعمال في أوقات قياسية.",
      },
      {
        title: "رحلة تشاركية",
        description:
          "نحرص على إشراك العميل في كافة خطوات ومراحل العمل من خلال التقارير والاجتماعات الدورية وورش العمل والزيارات المتبادلة والتواصل الفعال.",
      },
    ] as TitledItem[],
  },
  footer: {
    about:
      "الشريك الاستراتيجي الأول والموثوق في تمكين المنظمات غير الربحية لنقود التحول نحو مؤسسية رائدة وأثر مجتمعي مستدام.",
    quickLinksTitle: "روابط سريعة",
    quickLinks: [
      { label: "الرئيسية", href: "#intro" },
      { label: "من نحن", href: "#about" },
      { label: "رؤيتنا", href: "#vision" },
      { label: "تسجيل الدخول", href: "/portals" },
      { label: "سياسة الخصوصية", href: "/privacy-policy" },
    ] as LinkItem[],
    contactTitle: "تواصل معنا",
    address: "المملكة العربية السعودية\nجدة - أبرق الرغامة",
    phone: "+966 55 549 3583",
    email: "zad.adm.ksa@gmail.com",
    copyright: "جميع الحقوق محفوظة لشركة زاد التنموية",
    bottomLinks: [
      { label: "سياسة الخصوصية", href: "/privacy-policy" },
      { label: "الشروط والأحكام", href: "#" },
    ] as LinkItem[],
  },
};

export function makeDefaultLandingConfig(): LandingConfig {
  const sections = {} as Record<SectionKey, SectionConfig>;
  for (const key of SECTION_ORDER) {
    sections[key] = {
      enabled: true,
      content: JSON.parse(JSON.stringify(DEFAULT_CONTENT[key])),
      style: defaultStyle(),
    };
  }
  return { sections };
}

export const DEFAULT_LANDING_CONFIG: LandingConfig = makeDefaultLandingConfig();

// ── الدمج/التطبيع ────────────────────────────────────────────────────────────

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function mergeBackground(raw: unknown): BackgroundStyle {
  const base = defaultStyle().background;
  if (!isObj(raw)) return base;
  const types: BackgroundType[] = ["none", "solid", "gradient", "image"];
  const animTypes: AnimationType[] = [
    "none",
    "gradient-shift",
    "aurora",
    "floating-blobs",
    "drifting-dots",
  ];
  const rg = isObj(raw.gradient) ? raw.gradient : {};
  const ri = isObj(raw.image) ? raw.image : null;
  const ra = isObj(raw.animation) ? raw.animation : {};
  return {
    type: types.includes(raw.type as BackgroundType) ? (raw.type as BackgroundType) : base.type,
    color: typeof raw.color === "string" ? raw.color : base.color,
    gradient: {
      from: typeof rg.from === "string" ? rg.from : base.gradient.from,
      to: typeof rg.to === "string" ? rg.to : base.gradient.to,
      angle: typeof rg.angle === "number" ? rg.angle : base.gradient.angle,
    },
    image:
      ri && typeof ri.url === "string" && ri.url
        ? {
            url: ri.url,
            publicId: typeof ri.publicId === "string" ? ri.publicId : undefined,
            opacity: typeof ri.opacity === "number" ? ri.opacity : 1,
            overlayColor: typeof ri.overlayColor === "string" ? ri.overlayColor : "#0f766e",
            overlayOpacity: typeof ri.overlayOpacity === "number" ? ri.overlayOpacity : 0,
            blur: typeof ri.blur === "number" ? ri.blur : 0,
          }
        : null,
    animation: {
      type: animTypes.includes(ra.type as AnimationType)
        ? (ra.type as AnimationType)
        : base.animation.type,
      speed: typeof ra.speed === "number" ? ra.speed : base.animation.speed,
      colorA: typeof ra.colorA === "string" ? ra.colorA : base.animation.colorA,
      colorB: typeof ra.colorB === "string" ? ra.colorB : base.animation.colorB,
    },
  };
}

function mergeText(raw: unknown): TextStyle {
  const base = defaultStyle().text;
  if (!isObj(raw)) return base;
  const aligns = ["right", "center", "left"];
  return {
    headingColor: typeof raw.headingColor === "string" ? raw.headingColor : base.headingColor,
    bodyColor: typeof raw.bodyColor === "string" ? raw.bodyColor : base.bodyColor,
    headingScale: typeof raw.headingScale === "number" ? raw.headingScale : base.headingScale,
    bodyScale: typeof raw.bodyScale === "number" ? raw.bodyScale : base.bodyScale,
    align: aligns.includes(raw.align as string) ? (raw.align as TextStyle["align"]) : base.align,
  };
}

/**
 * دمج عميق فوق الافتراضات: كل مفتاح غائب أو تالف يعود لقيمته الأصلية، فلا يكسر
 * إعدادٌ قديم ناقص الصفحةَ ولا يخفي فقرة لم يُذكر لها `enabled`.
 */
export function normalizeLandingConfig(raw: unknown): LandingConfig {
  const out = makeDefaultLandingConfig();
  const rawSections = isObj(raw) && isObj(raw.sections) ? raw.sections : {};
  for (const key of SECTION_ORDER) {
    const rs = rawSections[key];
    if (!isObj(rs)) continue;
    const def = out.sections[key];
    def.enabled = typeof rs.enabled === "boolean" ? rs.enabled : true;
    if (isObj(rs.content)) {
      def.content = { ...def.content, ...rs.content };
    }
    if (isObj(rs.style)) {
      def.style = {
        background: mergeBackground(rs.style.background),
        text: mergeText(rs.style.text),
      };
    }
  }
  return out;
}

/** يحوّل لون hex + شفافية إلى rgba() لأجل الطبقات نصف الشفافة. */
export function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-fA-F0-9]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
