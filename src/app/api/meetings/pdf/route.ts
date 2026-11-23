import { NextRequest, NextResponse } from "next/server";
import { requirePermission, authErrorResponse } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { isTier1 } from "@/lib/permissions";
import { buildLetterheadDoc } from "@/app/(dashboard)/main/(main)/meetings/utils/meetingLetterheadDoc";

// متصفّحٌ كاملٌ يُشغَّل لكلِّ ملف: إقلاعُه بضعُ ثوانٍ.
export const maxDuration = 60;

/**
 * ملفُّ PDF للمحضر بالكليشة — الصفحةُ نفسُها التي يطبعها زرُّ الطباعة، تُفتح في
 * متصفّحٍ على الخادم وتُحفظ PDF، فيبقى النصُّ العربيُّ نصّاً يُنسخ ويُبحث فيه.
 *
 * يُبنى المحضرُ هنا من القاعدة بمعرّفه، لا من HTML يُرسله المتصفّح: الصفحةُ
 * تُشغَّل بسكربتها على الخادم، فلا يُشغَّل فيها إلا ما بنيناه. وبالحارس نفسِه
 * الذي يعرض المحاضر: المحضرُ الخاصّ لا يصل إليه إلا من يراه هناك.
 */
export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requirePermission("manage_meetings");
  } catch (err) {
    return authErrorResponse(err);
  }

  let body: { meetingId?: unknown; meetingNum?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const meetingId = typeof body.meetingId === "string" ? body.meetingId : "";
  // الرقمُ التسلسليُّ للعرض فقط (ZAD_M_033)، تحسبه القائمةُ من ترتيب المحاضر.
  const meetingNum =
    typeof body.meetingNum === "number" && Number.isInteger(body.meetingNum) && body.meetingNum > 0
      ? body.meetingNum
      : undefined;
  if (!meetingId) return NextResponse.json({ error: "المحضر غير محدد" }, { status: 400 });

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      meetingTasks: {
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!meeting || (meeting.isPrivate && !isTier1(session.role, session.permissions || []))) {
    return NextResponse.json({ error: "المحضر غير موجود" }, { status: 404 });
  }

  const origin = req.nextUrl.origin;
  const html = buildLetterheadDoc(meeting, false, meetingNum, origin);

  let browser: import("puppeteer-core").Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    // لا يُجلب إلا ما تحتاجه الصفحة: صورةُ الكليشة من موقعنا، وخطُّ Cairo.
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      const url = r.url();
      const allowed =
        url.startsWith("data:") ||
        url.startsWith(`${origin}/assets/`) ||
        url.startsWith("https://fonts.googleapis.com/") ||
        url.startsWith("https://fonts.gstatic.com/");
      if (allowed) void r.continue();
      else void r.abort();
    });

    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
    // التخطيطُ يقسم المحضرَ صفحاتٍ بعد تحميل الخطّ، ثم يضع هذه العلامة.
    await page.waitForSelector("body[data-ready]", { timeout: 20_000 });
    // وصورةُ الكليشة في كلِّ صفحةٍ تُضاف بعد التحميل — فتُنتظر حتى تكتمل.
    await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete), { timeout: 15_000 });
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });

    const fileName = `${meeting.title.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100) || "محضر"}.pdf`;
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Meeting PDF error:", err);
    // السببُ التقنيُّ يُذكر: المسارُ لمن يدير المحاضر فقط، وبه يُشخَّص العطلُ بلا سجلّ الخادم.
    const detail = err instanceof Error ? err.message.slice(0, 200) : "";
    return NextResponse.json(
      { error: `تعذّر إنشاء ملف PDF للمحضر${detail ? ` (${detail})` : ""}` },
      { status: 500 }
    );
  } finally {
    await browser?.close().catch(() => {});
  }
}

/**
 * على Vercel: Chromium المضغوطُ المصمَّمُ للدوالّ. وعلى جهاز التطوير: Chrome
 * المثبَّت (أو ما يحدّده `CHROME_PATH`).
 */
async function launchBrowser() {
  const puppeteer = (await import("puppeteer-core")).default;
  if (process.env.VERCEL || process.platform === "linux") {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  return puppeteer.launch({
    executablePath:
      process.env.CHROME_PATH ||
      (process.platform === "win32"
        ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
        : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
    headless: true,
  });
}
