/**
 * تصديرُ الطلب المالي على كليشة زاد — صفحةُ A4 تُطبع أو تُحفظ PDF.
 *
 * ونمطُ الكليشة مستوردٌ من `letterhead.ts` لا مكتوبٌ هنا: المحضرُ والطلب
 * يطبعان على كليشةٍ واحدة، فنسختان من مقاسها تفترقان عند أوّل تعديل.
 *
 * وبانيها خاصٌّ به لا بانيُ المحضر: هذا جدولٌ ثابتٌ معروفُ الحقول، وذاك
 * Markdown حرٌّ يُترجَم. وما شُورك فعلاً هو ما يُشارَك: الصفحةُ ونمطُها.
 */

import { notify } from "@/components/console/toastBus";
import { LETTERHEAD_CSS } from "./letterhead";
import { amounts, formatAmount, serialLabel } from "./financialRequest";

export type DocTrailStep = {
  actor: string;
  action: string;
  note: string | null;
  at: string | Date;
  /** عددُ ما أُرفق بالقرار — يُذكر ولا يُطبع الملفّ نفسه. */
  attachmentCount?: number;
};

export type FinancialDocInput = {
  serial: number;
  typeLabel: string;
  title: string;
  body: string | null;
  createdByName: string;
  createdAt: string | Date;
  statusLabel: string;
  amount: string;
  isTaxable: boolean;
  taxRate: string | null;
  bankName: string | null;
  iban: string | null;
  accountNumber: string | null;
  trail: DocTrailStep[];
};

const FINANCIAL_DOC_CSS = `
  .doc-label { text-align: center; font-size: 9pt; font-weight: 600; color: #0f766e; margin-bottom: 2px; letter-spacing: 0.5px; }
  .doc-title { text-align: center; font-size: 13pt; font-weight: 700; color: #1a1a1a; margin-bottom: 10px; border-bottom: 1.5px solid #bfe6e1; padding-bottom: 6px; }
  .doc-section { color: #0f766e; font-size: 10.5pt; font-weight: 700; margin: 8px 0 3px; }
  .doc-table { width: 100%; border-collapse: collapse; margin: 4px 0 6px; font-size: 9.5pt; direction: rtl; }
  .doc-table th, .doc-table td { border: 1px solid #99c2bd; padding: 4px 8px; text-align: right; vertical-align: top; }
  .doc-table th { background-color: #e6f2f0; font-weight: 700; color: #0f766e; text-align: center; }
  .doc-table td.k { background-color: #f0f7f6; font-weight: 600; width: 28%; color: #0f766e; }
  .doc-table td.num { direction: ltr; text-align: center; font-variant-numeric: tabular-nums; }
  .doc-body p { margin: 2px 0; font-size: 10pt; line-height: 1.55; }
  .doc-total td { font-weight: 700; }
  .sign-area { position: absolute; right: 17mm; left: 17mm; bottom: 60mm; z-index: 2; display: flex; gap: 14mm; justify-content: center; }
  .sign-box { width: 55mm; }
  .sign-box .cap { text-align: center; font-size: 9.5pt; font-weight: 700; color: #0f766e; margin-bottom: 2mm; }
  .sign-box .frame { height: 22mm; border: 1px solid #99c2bd; border-radius: 2mm; }
`;

const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function formatDate(value: string | Date): string {
  const d = new Date(value);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** متنُ الوثيقة: كتلٌ من المستوى الأعلى يُقسّمها السكربت على الصفحات. */
function buildBody(input: FinancialDocInput): string {
  const totals = amounts(input);
  const blocks: string[] = [];

  blocks.push(`<div class="doc-label">طلب مالي</div>`);
  blocks.push(`<div class="doc-title">${esc(input.title)}</div>`);

  blocks.push(`<table class="doc-table">
    <tr><td class="k">نوع الطلب</td><td>${esc(input.typeLabel)}</td><td class="k">الحالة</td><td>${esc(input.statusLabel)}</td></tr>
    <tr><td class="k">مُقدِّم الطلب</td><td>${esc(input.createdByName)}</td><td class="k">تاريخ الرفع</td><td class="num">${esc(formatDate(input.createdAt))}</td></tr>
  </table>`);

  if (input.body?.trim()) {
    blocks.push(`<div class="doc-section">تفاصيل الطلب</div>`);
    // سطراً سطراً: كتلٌ صغيرةٌ تُقسَّم على الصفحات، فلا يُقصّ نصٌّ طويل.
    for (const line of input.body.split(/\r?\n/)) {
      blocks.push(`<div class="doc-body"><p>${esc(line) || "&nbsp;"}</p></div>`);
    }
  }

  blocks.push(`<div class="doc-section">المبلغ</div>`);
  const taxHead = totals.taxRate !== null ? `الضريبة ${esc(formatAmount(totals.taxRate))}٪` : "الضريبة";
  blocks.push(`<table class="doc-table">
    <tr><th>المبلغ</th><th>${taxHead}</th><th>الإجمالي</th></tr>
    <tr class="doc-total">
      <td class="num">${esc(formatAmount(totals.amount))}</td>
      <td class="num">${esc(formatAmount(totals.taxAmount))}</td>
      <td class="num">${esc(formatAmount(totals.total))}</td>
    </tr>
  </table>`);

  const bankRows = [
    { label: "اسم البنك", value: input.bankName, num: false },
    { label: "الآيبان", value: input.iban, num: true },
    { label: "رقم الحساب", value: input.accountNumber, num: true },
  ].filter((r) => r.value?.trim());

  if (bankRows.length) {
    blocks.push(`<div class="doc-section">الحساب البنكي</div>`);
    blocks.push(`<table class="doc-table">${bankRows
      .map((r) => `<tr><td class="k">${r.label}</td><td class="${r.num ? "num" : ""}">${esc(r.value)}</td></tr>`)
      .join("")}</table>`);
  }

  if (input.trail.length) {
    blocks.push(`<div class="doc-section">مسار الاعتماد</div>`);
    const rows = input.trail
      .map((step) => {
        const note = step.note?.trim() ? esc(step.note) : "—";
        const stamped = step.attachmentCount ? ` (${step.attachmentCount} مرفق)` : "";
        return `<tr><td>${esc(step.actor)}</td><td>${esc(step.action)}${stamped}</td><td class="num">${esc(formatDate(step.at))}</td><td>${note}</td></tr>`;
      })
      .join("");
    blocks.push(`<table class="doc-table">
      <tr><th>الاسم</th><th>الإجراء</th><th>التاريخ</th><th>الملاحظة</th></tr>
      ${rows}
    </table>`);
  }

  return blocks.join("\n");
}

/** كتلةُ الختم والتوقيع: مربّعان مفرّغان، لا يُطبع فيهما شيء. */
const SIGN_HTML = `<div class="sign-area">
  <div class="sign-box"><div class="cap">الختم</div><div class="frame"></div></div>
  <div class="sign-box"><div class="cap">التوقيع</div><div class="frame"></div></div>
</div>`;

/**
 * وثيقةُ الطلب كاملةً، وفيها سكربتُ تقسيمِ الصفحات.
 *
 * والتقسيمُ في المتصفّح لا في الخادم: ارتفاعُ النصّ لا يُعرف إلا بعد رسمه
 * بخطّه، ومنطقةُ المحتوى `overflow: hidden` — فما لا يُقسَّم يُقصّ بلا إنذار،
 * وهو الخللُ نفسُه الذي أصاب المحاضر الطويلة.
 */
export function buildFinancialDoc(input: FinancialDocInput, forPrint: boolean): string {
  const body = buildBody(input);
  const safeBody = JSON.stringify(body).replace(/<\/(script)/gi, "<\\/$1");
  const safeSign = JSON.stringify(SIGN_HTML).replace(/<\/(script)/gi, "<\\/$1");
  const letterheadUrl = `${window.location.origin}/assets/letterhead.png`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><title>${esc(serialLabel(input.serial))} — ${esc(input.title)}</title>
<style>${LETTERHEAD_CSS}${FINANCIAL_DOC_CSS}</style>
</head>
<body>
<div id="root"></div>
<script>
(function () {
  var letterheadUrl = ${JSON.stringify(letterheadUrl)};
  var dateStr = ${JSON.stringify(formatDate(input.createdAt))};
  var numStr = ${JSON.stringify(serialLabel(input.serial))};
  var shouldPrint = ${forPrint};

  var tmp = document.createElement('div');
  tmp.innerHTML = ${safeBody};
  var nodes = Array.prototype.slice.call(tmp.children);

  var PAGE_H = 1123, TOP_OFFSET = 189, BOT_OFFSET = 208;
  var USABLE = PAGE_H - TOP_OFFSET - BOT_OFFSET;
  var SIGN_H = 130;
  var root = document.getElementById('root');
  var pages = [];

  function newPage() {
    var page = document.createElement('div');
    page.className = 'page';
    var img = document.createElement('img');
    img.className = 'letterhead';
    img.src = letterheadUrl;
    page.appendChild(img);
    var numDiv = document.createElement('div');
    numDiv.className = 'number-area';
    numDiv.textContent = numStr;
    page.appendChild(numDiv);
    var dateDiv = document.createElement('div');
    dateDiv.className = 'date-area';
    dateDiv.textContent = dateStr;
    page.appendChild(dateDiv);
    var area = document.createElement('div');
    area.className = 'content-area';
    page.appendChild(area);
    root.appendChild(page);
    pages.push(page);
    return area;
  }

  var probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;top:-9999px;right:0;width:176mm;font-family:Cairo,Segoe UI,Tahoma,sans-serif;font-size:10.5pt;line-height:1.55;direction:rtl;';
  document.body.appendChild(probe);

  var area = newPage();
  var used = 0;

  function heightOf(el) {
    probe.appendChild(el);
    var h = el.offsetHeight || 18;
    probe.removeChild(el);
    return h;
  }

  function place(el, h) {
    area.appendChild(el);
    used += h;
  }

  function atomic(el) {
    var h = heightOf(el);
    if (used + h > USABLE && used > 0) { area = newPage(); used = 0; }
    place(el, h);
  }

  // جدولٌ طويل يُقسَّم صفّاً صفّاً ويتكرّر رأسُه: الجدولُ عقدةٌ واحدةٌ لا
  // تتجزّأ، فلو نُقل كاملاً قُصّ ما تجاوز حدَّ الصفحة بلا إنذار.
  function splitTable(table) {
    var rows = Array.prototype.slice.call(table.rows);
    if (rows.length < 3) { atomic(table); return; }

    var header = rows[0];
    var rest = rows.slice(1);
    var i = 0;
    while (i < rest.length) {
      var part = document.createElement('table');
      part.className = table.className;
      part.appendChild(header.cloneNode(true));
      var partH = heightOf(part);
      if (used + partH > USABLE && used > 0) { area = newPage(); used = 0; }

      var added = 0;
      while (i < rest.length) {
        var row = rest[i].cloneNode(true);
        part.appendChild(row);
        var withRow = heightOf(part);
        if (used + withRow > USABLE && added > 0) { part.removeChild(part.lastChild); break; }
        partH = withRow;
        added += 1;
        i += 1;
      }
      place(part, partH);
      if (i < rest.length) { area = newPage(); used = 0; }
    }
  }

  for (var n = 0; n < nodes.length; n += 1) {
    var node = nodes[n];
    if (node.tagName === 'TABLE') splitTable(node);
    else atomic(node);
  }

  // كتلةُ الختم والتوقيع في أسفل آخر صفحة — بموضعٍ مطلقٍ فوق حدّ الكليشة
  // السفلي. وإن لم يبقَ في الصفحة متّسعٌ لها أُفردت لها صفحة، فلا تُطبَع
  // فوق نصّ.
  if (used + SIGN_H > USABLE) { area = newPage(); used = 0; }
  var holder = document.createElement('div');
  holder.innerHTML = ${safeSign};
  pages[pages.length - 1].appendChild(holder.firstElementChild);

  document.body.removeChild(probe);

  if (shouldPrint) {
    var fire = function () { window.focus(); window.print(); };
    var img = document.querySelector('img.letterhead');
    if (img && !img.complete) img.addEventListener('load', function () { setTimeout(fire, 150); });
    else setTimeout(fire, 350);
  }
})();
</script>
</body>
</html>`;
}

/** يفتح حوارَ الطباعة في إطارٍ خفيّ — ومنه «حفظ كـPDF». */
export function printFinancialRequest(input: FinancialDocInput) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    notify("error", "تعذر فتح نافذة الطباعة. يرجى التحقق من إعدادات المتصفح.");
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(buildFinancialDoc(input, true));
  doc.close();

  // السكربتُ في الوثيقة هو من ينادي window.print()، وهذا تنظيفٌ بعده.
  setTimeout(() => iframe.remove(), 5000);
}

/** يفتح الوثيقة في تبويبٍ جديدٍ للمعاينة بلا طباعة. */
export function previewFinancialRequest(input: FinancialDocInput) {
  const win = window.open("", "_blank");
  if (!win) {
    notify("error", "الرجاء السماح بفتح النوافذ المنبثقة (Popups) لعرض الكليشة.");
    return;
  }
  win.document.open();
  win.document.write(buildFinancialDoc(input, false));
  win.document.close();
}
