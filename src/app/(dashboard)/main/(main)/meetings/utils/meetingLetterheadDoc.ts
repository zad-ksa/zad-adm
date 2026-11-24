// صفحةُ المحضر بالكليشة (HTML) — للعرض والطباعة في المتصفّح، ولتوليد PDF على
// الخادم. منطقٌ خالصٌ بلا واجهة، فيُستورد من الجهتين.

import type { Meeting } from "../MeetingsClient";
import { meetingAssigneeName } from "./meetingAssignee";
// بناءُ HTML المحضر منطقٌ خالصٌ له اختباراته في العدة — والطباعةُ هنا تستعمله.
import { escapeHtml, mdToHtml, replaceTasksTable } from "@/lib/meetingMarkdown";

/** ما يلزم من المحضر لبنائه — يوافقه محضرُ الواجهة ومحضرُ القاعدة كلاهما. */
export type LetterheadMeeting = Pick<Meeting, "title" | "formattedContent"> & {
  date: string | Date;
  meetingTasks: Pick<Meeting["meetingTasks"][number], "title" | "isDone" | "dueDays" | "assignedTo" | "assignedToName">[];
};

function formatDate(d: string | Date) {
  const dt = new Date(d);
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${year}-${month}-${day}`;
}


/**
 * جدولُ المهام المحفوظةِ — بالمكلَّف والمدّة والحالة، وهي ممّا لا يحمله جدولُ
 * المحضر المكتوب. فيحلّ محلَّه في موضعه تحت عنوانه، ولا يُذيَّل به المحضرُ بعد
 * الختام. وبلا مهامٍّ محفوظةٍ يُطبع جدولُ المحضر كما كُتب — كان يُحذف ولا
 * يُعاد، فيخرج المحضرُ بقسمٍ ناقص.
 */
function tasksTableHtml(tasks: LetterheadMeeting["meetingTasks"]): string {
  const rows = tasks.map(t => {
    const assignee = escapeHtml(meetingAssigneeName(t) || "—");
    const status = t.isDone ? "✓ مكتملة" : "قيد التنفيذ";
    const due = t.dueDays ? `${t.dueDays} يوم` : "—";
    return `<tr><td>${escapeHtml(t.title)}</td><td>${assignee}</td><td>${due}</td><td style="color:${t.isDone ? "#10b981" : "#f59e0b"}">${status}</td></tr>`;
  }).join("");
  return `<table><tr><th>المهمة</th><th>المكلف</th><th>المدة</th><th>الحالة</th></tr>${rows}</table>`;
}


/**
 * صفحةُ المحضر بالكليشة.
 *
 * **المتصفّحُ يقسم الصفحات، لا سكربتٌ يقيس.** كان سكربتٌ يقيس كلَّ فقرةٍ على
 * الشاشة ويوزّعها على صفحاتٍ مقفلةٍ تقصّ ما يفيض. والمتصفّحُ يكسر الأسطرَ عند
 * الطباعة بفرقٍ يسيرٍ عن الشاشة، فتطول فقرةٌ سطراً فيُقصّ آخرُها بلا إنذار —
 * وكلُّ «هامش أمان» يُزاد كان أصغرَ من سطر. فالآن يجري المحضرُ متّصلاً،
 * ويقسمه محرّكُ الطباعة نفسُه بين الأسطر كما يفعل Word:
 *   - الكليشةُ والرقمُ والتاريخ `position: fixed`، فتتكرّر على كلِّ صفحةٍ مطبوعة.
 *   - هامشا الكليشة العلويُّ والسفليُّ رأسُ جدولٍ وذيلُه (`thead`/`tfoot`)،
 *     وهما يتكرّران في كلِّ صفحة — فلا يمسّ النصُّ رأسَ الكليشة ولا تذييلَها.
 *   - صفوفُ الجداول لا تنشطر، ورأسُ الجدول يتكرّر، والعنوانُ يلزم ما بعده.
 * فلا شيءَ يُقاس، ولا شيءَ يُقصّ.
 */
export function buildLetterheadDoc(
  m: LetterheadMeeting,
  forPrint: boolean,
  meetingNum?: number,
  /** أصلُ الموقع لصورة الكليشة — الخادمُ يمرّره، والمتصفّحُ يأخذه من نافذته. */
  origin: string = window.location.origin
): string {
  const rawHtml = mdToHtml(m.formattedContent);
  const cleanHtml = m.meetingTasks.length > 0
    ? replaceTasksTable(rawHtml, tasksTableHtml(m.meetingTasks), '<h3 class="sub-title">المهام والتكليفات</h3>')
    : rawHtml;
  const footer = `<p class="footer-note"><em>صدر هذا المحضر عن شركة زاد للخدمات التنموية</em></p><p class="footer-note"><em>محضر إلكتروني عبر موقع زاد</em></p>`;
  const body = `<div class="meeting-label">محضر اجتماع</div><div class="meeting-title">${escapeHtml(m.title)}</div>\n` + cleanHtml + "\n" + footer;
  const dateStr = formatDate(m.date);
  const numStr = meetingNum ? `ZAD_M_${String(meetingNum).padStart(3, "0")}` : "";
  const letterheadUrl = `${origin}/assets/letterhead.png`;

  // المتنُ يُدرج بـinnerHTML لا في النصّ مباشرة: سكربتٌ في محتوى المحضر لا يُشغَّل.
  const safeBody = JSON.stringify(body).replace(/<\/(script)/ig, "<\/$1");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><title>${escapeHtml(m.title)}</title>
<style>${FLOW_CSS}</style>
</head>
<body>
<img class="lh-bg" src="${escapeHtml(letterheadUrl)}" alt="">
${numStr ? `<div class="lh-num">${escapeHtml(numStr)}</div>` : ""}
<div class="lh-date">${escapeHtml(dateStr)}</div>
<table class="lh-frame">
  <thead><tr><td class="lh-top"></td></tr></thead>
  <tfoot><tr><td class="lh-bottom"></td></tr></tfoot>
  <tbody><tr><td class="lh-body"><div class="content" id="content"></div></td></tr></tbody>
</table>
<script>
(function() {
  var shouldPrint = ${forPrint};
  var content = document.getElementById('content');
  content.innerHTML = ${safeBody};

  // صفُّ رؤوس الجدول (th) يصير thead، فيتكرّر في كلِّ صفحةٍ ينشطر عليها الجدول.
  Array.prototype.forEach.call(content.querySelectorAll('table'), function(t) {
    if (t.tHead || !t.rows.length) return;
    var first = t.rows[0];
    if (!first.querySelector('th')) return;
    var head = t.createTHead();
    head.appendChild(first);
  });

  // فقرةٌ غامقةٌ كلُّها («**٤. نموذج الإفصاح**») أو قصيرةٌ تنتهي بنقطتين عنوانٌ
  // صغير: تلزم ما بعدها فلا تبقى وحدها آخرَ الصفحة.
  Array.prototype.forEach.call(content.querySelectorAll('p'), function(p) {
    var text = (p.textContent || '').trim();
    if (!text) return;
    var strong = p.querySelector('strong, b');
    var allBold = strong && (strong.textContent || '').trim() === text;
    if (allBold || (text.length <= 60 && /[:：]$/.test(text))) p.classList.add('keep-next');
  });

  function done() {
    // علامةُ الجاهزية — مولِّدُ PDF على الخادم ينتظرها.
    document.body.setAttribute('data-ready', '1');
    if (shouldPrint) setTimeout(function() { window.print(); }, 300);
  }

  // تُنتظر أوزانُ خطّ Cairo وصورةُ الكليشة قبل الطباعة: بغيرها يُطبع بخطٍّ بديلٍ أو بلا كليشة.
  var fontsReady = (document.fonts && document.fonts.load)
    ? Promise.all(['400', '600', '700'].map(function(w) {
        return document.fonts.load(w + ' 12px Cairo').catch(function() {});
      }))
    : Promise.resolve();
  var bg = document.querySelector('.lh-bg');
  var imgReady = new Promise(function(res) {
    if (!bg || bg.complete) return res();
    bg.onload = bg.onerror = function() { res(); };
  });
  var finished = false;
  function finish() { if (!finished) { finished = true; done(); } }
  Promise.all([fontsReady, imgReady]).then(finish, finish);
  setTimeout(finish, 4000);
})();
</script>
</body></html>`;
}

// أبعادُ الكليشة كما في LETTERHEAD_CSS: رأسُها ٥٠مم، وتذييلُها ٥٥مم، وجانباها ١٧مم.
const FLOW_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4; margin: 0; }
  html, body { background: white; font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; direction: rtl;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { width: 210mm; margin: 0 auto; position: relative; }
  .lh-bg { position: fixed; top: 0; left: 0; width: 210mm; height: 297mm; z-index: 0; }
  .lh-num, .lh-date { position: fixed; left: 12mm; z-index: 2; font-size: 8.5pt; color: #111; direction: ltr;
    letter-spacing: 1px; font-family: 'Courier New', monospace; }
  .lh-num { top: 14mm; } .lh-date { top: 19mm; }
  @media screen {
    html { background: #888; } body { background: white; min-height: 297mm; }
    .lh-bg, .lh-num, .lh-date { position: absolute; }
  }
  table.lh-frame { width: 100%; border-collapse: collapse; position: relative; z-index: 1; }
  table.lh-frame > thead > tr > td, table.lh-frame > tfoot > tr > td,
  table.lh-frame > tbody > tr > td { border: none; padding: 0; background: none; }
  td.lh-top { height: 50mm; } td.lh-bottom { height: 55mm; }
  td.lh-body { padding: 0 17mm !important; }

  .content { direction: rtl; text-align: right; font-size: 10.5pt; line-height: 1.55; color: #1a1a1a; orphans: 2; widows: 2; }
  .content .meeting-label { text-align: center; font-size: 9pt; font-weight: 600; color: #0f766e; margin-bottom: 2px; letter-spacing: 0.5px; }
  .content .meeting-title { text-align: center; font-size: 13pt; font-weight: 700; color: #1a1a1a; margin-bottom: 10px; border-bottom: 1.5px solid #bfe6e1; padding-bottom: 6px; }
  .content h2.sec-title { color: #0f766e; font-size: 12pt; font-weight: 700; text-align: center; margin: 8px 0 4px; padding-bottom: 2px; border-bottom: 1.5px solid #bfe6e1; }
  .content h3.sub-title { color: #0f766e; font-size: 10.5pt; font-weight: 700; text-align: center; margin: 6px 0 3px; }
  .content h4.sub-title { color: #0f766e; font-size: 10pt; font-weight: 700; margin: 5px 0 2px; }
  .content h1, .content h2, .content h3, .content h4, .content .meeting-title, .content p.keep-next { break-after: avoid; page-break-after: avoid; }
  .content p { margin: 2px 0; } .content br { display: block; margin: 1px 0; }
  .content ul, .content ol { padding-right: 16px; margin: 2px 0 5px; } .content ul { list-style: disc; }
  .content li { margin-bottom: 2px; line-height: 1.45; break-inside: avoid; }
  .content hr { border: none; border-top: 1px solid #ddd; margin: 5px 0; }
  .content p.footer-note { text-align: center; color: #64748b; font-size: 9pt; margin: 2px 0; }
  .content strong { font-weight: 700; }
  .content table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 9.5pt; direction: rtl; }
  .content th, .content td { border: 1px solid #99c2bd; padding: 4px 8px; text-align: right; vertical-align: top; }
  .content th { background-color: #e6f2f0; font-weight: 700; color: #0f766e; text-align: center; }
  .content tr { break-inside: avoid; page-break-inside: avoid; }
  .content tbody tr:nth-child(even) td { background-color: #f0f7f6; }
`;
