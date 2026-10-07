import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, authErrorResponse } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { normalizeProjectBuilderOptions, buildProjectPrompt, type ProjectBuilderBudget } from "@/lib/projectBuilder";

/**
 * يصوغ وثيقة مبادرة جديدة بالذكاء الاصطناعي.
 *
 * لا شيء هنا ثابتٌ في الكود: البرومبت هو أحدث إصدار في
 * ProjectBuilderPromptVersion، وتفضيلات المحتوى من GlobalSetting، ومعلومات
 * الجمعية من ProjectBuilderCharityProfile — كلها تُقرأ بمعرّف الجمعية من
 * قاعدة البيانات، لا مما يرسله المتصفح. فمن يملك "use_project_builder" فقط لا
 * يرى البرومبت ولا يستطيع التأثير فيه إطلاقاً — ما يرسله هو اسم المبادرة
 * وفكرتها والتفضيلات المفعّلة والميزانية والتوجيهات، وهذه وحدها.
 */
export async function POST(req: NextRequest) {
  try {
    await requirePermission("use_project_builder");
  } catch (err) {
    return authErrorResponse(err);
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    const { charityId, programName, programIdea, preferences, budget, directives } = body;
    if (!charityId?.trim()) return NextResponse.json({ error: "اختر الجمعية" }, { status: 400 });
    if (!programName?.trim()) return NextResponse.json({ error: "اسم المبادرة مطلوب" }, { status: 400 });
    if (!programIdea?.trim()) return NextResponse.json({ error: "فكرة المبادرة مطلوبة" }, { status: 400 });

    const [charity, profile, optionsRecord, promptVersion] = await Promise.all([
      prisma.charity.findUnique({ where: { id: charityId }, select: { name: true } }),
      prisma.projectBuilderCharityProfile.findUnique({ where: { charityId } }),
      prisma.globalSetting.findUnique({ where: { key: "PROJECT_BUILDER_OPTIONS" } }),
      prisma.projectBuilderPromptVersion.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);

    if (!charity) return NextResponse.json({ error: "الجمعية غير موجودة" }, { status: 404 });
    if (!profile) {
      return NextResponse.json(
        { error: "لم تُضَف المعلومات الثابتة لهذه الجمعية بعد. تواصل مع من يملك صلاحية التحكم بالأداة." },
        { status: 409 }
      );
    }
    if (!promptVersion) {
      return NextResponse.json(
        { error: "لم يُضَف برومبت معتمد للأداة بعد. تواصل مع من يملك صلاحية التحكم بالأداة." },
        { status: 409 }
      );
    }

    const { preferences: availablePreferences } = normalizeProjectBuilderOptions(optionsRecord?.value);
    const safePreferenceKeys: string[] = Array.isArray(preferences) ? preferences.filter((x) => typeof x === "string") : [];
    const activePreferences = availablePreferences.filter((p) => safePreferenceKeys.includes(p.key));

    const safeBudget: ProjectBuilderBudget = {
      include: budget?.include !== false,
      total: typeof budget?.total === "string" ? budget.total : "",
      reserve: !!budget?.reserve,
    };
    const safeDirectives: string[] = Array.isArray(directives)
      ? directives.filter((x) => typeof x === "string" && x.trim()).slice(0, 20)
      : [];

    const prompt = buildProjectPrompt(
      promptVersion.template,
      {
        charityName: charity.name,
        vision: profile.vision || "",
        mission: profile.mission || "",
        strategicGoals: profile.strategicGoals || "",
        field: profile.field || "",
        city: profile.city || "",
      },
      { programName: programName.trim(), programIdea: programIdea.trim() },
      activePreferences,
      safeBudget,
      safeDirectives
    );

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "مفتاح الذكاء الاصطناعي غير مضبوط في الخادم" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const content = textBlock?.type === "text" ? textBlock.text : "";
    if (!content) return NextResponse.json({ error: "لم يُنتج الذكاء الاصطناعي أي نص" }, { status: 502 });

    return NextResponse.json({
      content,
      truncated: message.stop_reason === "max_tokens",
      // يُحفظ على العميل ليُستأنف منه عند طلب تعديل لاحق — بلا إعادة إرسال القالب.
      history: [
        { role: "user", content: prompt },
        { role: "assistant", content },
      ],
    });
  } catch (err: any) {
    console.error("Project builder generate error:", err);
    return NextResponse.json(
      { error: err?.message || "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي" },
      { status: 500 }
    );
  }
}
