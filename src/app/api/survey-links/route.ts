import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const charityName = searchParams.get("charityName");
    const surveyType = searchParams.get("surveyType");

    if (token) {
      const link = await prisma.surveyLink.findUnique({
        where: { id: token },
      });
      if (!link) {
        return NextResponse.json({ error: "الرابط غير موجود" }, { status: 404 });
      }
      const charity = await prisma.charity.findUnique({
        where: { name: link.charityName },
        select: { logoUrl: true },
      });
      return NextResponse.json({
        ...link,
        logoUrl: charity?.logoUrl || null,
      });
    }

    if (charityName && surveyType) {
      const link = await prisma.surveyLink.findFirst({
        where: {
          charityName: decodeURIComponent(charityName),
          surveyType,
          isActive: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(link || null);
    }

    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  } catch (error) {
    console.error("SurveyLink GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await request.json();
    const { charityName, surveyType, charityFocus } = body;

    if (!charityName || !surveyType) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    let customQuestions = null;
    if (surveyType === "VISION_MISSION" && charityFocus) {
      try {
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY || "", // Ensure you have this in .env
        });

        const prompt = `أنت خبير في التخطيط الاستراتيجي للجمعيات الأهلية.
مجال عمل الجمعية هو: "${charityFocus}"

المطلوب إعادة صياغة السؤالين التاليين ليتناسبا مع مجال عمل الجمعية، مع استبدال الكلمات مثل "القيم" أو "المجال القيمي/الدعوي" بما يناسب مجال الجمعية المعطى. حافظ على نفس المعنى والهدف من السؤال.

السؤال الأول (visionQ4): "ما أهم أثر نتمنى أن تتركه الجمعية في مجال عملنا كجمعية متخصصة في القيم؟"
السؤال الثاني (missionQ5): "ما الذي يميّز جمعيتنا عن غيرها من الجمعيات المشابهة في المجال القيمي/الدعوي؟ (المنهجية، الخبرة، إلخ)"

أخرج النتيجة بصيغة JSON صالحة فقط بالهيكل التالي، وبدون أي نصوص إضافية أو علامات Markdown:
{
  "visionQ4": "السؤال الأول بعد الصياغة",
  "missionQ5": "السؤال الثاني بعد الصياغة"
}`;

        const msg = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 300,
          temperature: 0.7,
          messages: [{ role: "user", content: prompt }],
        });

        if (msg.content[0].type === "text") {
          let content = msg.content[0].text.trim();
          if (content.startsWith("```json")) {
            content = content.replace(/```json/g, "").replace(/```/g, "").trim();
          }
          customQuestions = JSON.parse(content);
        }
      } catch (error) {
        console.error("AI customization failed:", error);
        // We log the error but allow link creation to succeed without custom questions
      }
    }

    // Deactivate previous active links for this charity and survey type
    await prisma.surveyLink.updateMany({
      where: {
        charityName,
        surveyType,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Create a new active link
    const newLink = await prisma.surveyLink.create({
      data: {
        charityName,
        surveyType,
        isActive: true,
        // @ts-ignore
        customQuestions: customQuestions || undefined,
      },
    });

    return NextResponse.json(newLink);
  } catch (error) {
    console.error("SurveyLink POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await request.json();
    const { id, isActive } = body;

    if (!id || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const updatedLink = await prisma.surveyLink.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json(updatedLink);
  } catch (error) {
    console.error("SurveyLink PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
