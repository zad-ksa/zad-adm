import { Meeting, MeetingTask } from "../MeetingsClient";
import { meetingAssigneeName } from "./meetingAssignee";

// الاسم اليدوي نصٌّ حرّ يدخل HTML المحضر، فلا يُدرج كما كُتب.
const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ESCAPES[c]);
import { notify } from "@/components/console/toastBus";
import { LETTERHEAD_CSS } from "@/lib/letterhead";

function formatDate(d: string | Date) {
  const dt = new Date(d);
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${year}-${month}-${day}`;
}

function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

export function mdToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inTable = false;
  let inUl = false;

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^\|(.+)\|$/.test(line)) {
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      if (cells.every(c => /^[-: ]+$/.test(c))) continue;
      if (!inTable) { out.push("<table>"); inTable = true; }
      if (inUl) { out.push("</ul>"); inUl = false; }
      const isHeader = out[out.length - 1] === "<table>";
      const tag = isHeader ? "th" : "td";
      out.push(`<tr>${cells.map(c => `<${tag}>${applyInline(c)}</${tag}>`).join("")}</tr>`);
      continue;
    } else if (inTable) { out.push("</table>"); inTable = false; }

    if (/^[-•*] (.+)$/.test(line)) {
      const text = line.replace(/^[-•*] /, "");
      if (!inUl) { out.push("<ul>"); inUl = true; }
      out.push(`<li>${applyInline(text)}</li>`);
      continue;
    } else if (inUl) { out.push("</ul>"); inUl = false; }

    if (/^# (.+)$/.test(line)) {
      continue;
    } else if (/^## (.+)$/.test(line)) {
      out.push(`<h2 class="sec-title">${applyInline(line.replace(/^## /, ""))}</h2>`);
    } else if (/^### (.+)$/.test(line)) {
      out.push(`<h3 class="sub-title">${applyInline(line.replace(/^### /, ""))}</h3>`);
    } else if (/^#{1,6} (.+)$/.test(line)) {
      out.push(`<h4 class="sub-title">${applyInline(line.replace(/^#{1,6} /, ""))}</h4>`);
    } else if (/^---+$/.test(line)) {
      out.push("<hr>");
    } else if (line === "") {
      out.push("<br>");
    } else if (/صدر هذا المحضر|محضر إلكتروني/.test(line)) {
      continue;
    } else {
      out.push(`<p>${applyInline(line)}</p>`);
    }
  }

  if (inTable) out.push("</table>");
  if (inUl) out.push("</ul>");
  return out.join("\n");
}

function injectTasksIntoHtml(html: string, tasks: MeetingTask[]): string {
  if (tasks.length === 0) return html;
  const rows = tasks.map(t => {
    const assignee = escapeHtml(meetingAssigneeName(t) || "—");
    const status = t.isDone ? "✓ مكتملة" : "قيد التنفيذ";
    const due = t.dueDays ? `${t.dueDays} يوم` : "—";
    return `<tr><td>${t.title}</td><td>${assignee}</td><td>${due}</td><td style="color:${t.isDone ? "#10b981" : "#f59e0b"}">${status}</td></tr>`;
  }).join("");
  const table = `<h3 class="sub-title">المهام والتكليفات</h3><table><tr><th>المهمة</th><th>المكلف</th><th>المدة</th><th>الحالة</th></tr>${rows}</table>`;
  
  if (html.includes('footer-note')) {
    return html.replace(/(<p class="footer-note">)/, table + '\n$1');
  }
  return html + '\n' + table;
}


export function buildLetterheadDoc(m: Meeting, forPrint: boolean, meetingNum?: number): string {
  const rawHtml = mdToHtml(m.formattedContent);
  const cleanHtml = rawHtml.replace(/<h[23][^>]*>.*?(?:مهام|توصيات|تكليفات).*?<\/h[23]>\s*(<table[\s\S]*?<\/table>)/gi, "").replace(/<table[\s\S]*?<\/table>/gi, "");
  const footer = `<p class="footer-note"><em>صدر هذا المحضر عن شركة زاد للخدمات التنموية</em></p><p class="footer-note"><em>محضر إلكتروني عبر موقع زاد</em></p>`;
  const body = `<div class="meeting-label">محضر اجتماع</div><div class="meeting-title">${m.title}</div>\n` + injectTasksIntoHtml(cleanHtml, m.meetingTasks) + "\n" + footer;
  const dateStr = formatDate(m.date);
  const numStr = meetingNum ? `ZAD_M_${String(meetingNum).padStart(3, "0")}` : "";
  const letterheadUrl = `${window.location.origin}/assets/letterhead.png`;

  const safeBody = JSON.stringify(body).replace(/<\/(script)/ig, "<\\/$1");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><title>${m.title}</title>
<style>${LETTERHEAD_CSS}</style>
</head>
<body>
<div id="root"></div>
<script>
(function() {
  var letterheadUrl = ${JSON.stringify(letterheadUrl)};
  var dateStr = ${JSON.stringify(dateStr)};
  var numStr = ${JSON.stringify(numStr)};
  var shouldPrint = ${forPrint};
  var tmp = document.createElement('div');
  tmp.innerHTML = ${safeBody};
  var nodes = Array.from(tmp.childNodes);
  var root = document.getElementById('root');

  function newPage() {
    var page = document.createElement('div');
    page.className = 'page';
    var img = document.createElement('img');
    img.className = 'letterhead'; img.src = letterheadUrl;
    page.appendChild(img);
    if (numStr) {
      var numDiv = document.createElement('div');
      numDiv.className = 'number-area'; numDiv.textContent = numStr;
      page.appendChild(numDiv);
    }
    var dateDiv = document.createElement('div');
    dateDiv.className = 'date-area'; dateDiv.textContent = dateStr;
    page.appendChild(dateDiv);
    var ca = document.createElement('div');
    ca.className = 'content-area';
    page.appendChild(ca);
    root.appendChild(page);
    return ca;
  }

  function runLayout() {
  // التوزيع يُقاس في الصفحة نفسها، لا يُقدَّر خارجها.
  //
  // كانت الارتفاعات تُجمع من offsetHeight في عنصرٍ مخفيّ، وoffsetHeight لا يشمل
  // الهوامش: كل عنوانٍ وفقرةٍ وجدولٍ يُنقص الحساب عن الواقع، فيتراكم الفرق حتى
  // يوضع الصف خارج المنطقة ويقصّه overflow:hidden بلا إنذار. وقيس ذلك في متصفح
  // حقيقي: تجاوز ٩٠ بكسلاً في محضرٍ متوسط. فالآن يوضع العنصر في مكانه، ويُسأل
  // المتصفح أين انتهى، فلا يبقى حسابٌ يخطئ.
  var currentArea = newPage();

  // فسحةٌ لفروق تقريب الطباعة عن الشاشة، ولهامش آخر عنصر في الصفحة.
  var SAFE_GAP = 6;

  function fits(el) {
    return el.getBoundingClientRect().bottom <= currentArea.getBoundingClientRect().bottom - SAFE_GAP;
  }

  // عنصرٌ أطول من صفحةٍ كاملة لا موضع له يُقسم عنده. فيُترك ظاهراً ولو لامس
  // تذييل الكليشة: نصٌّ فوق التذييل يُرى ويُصلَح، ونصٌّ مقصوصٌ يضيع بلا أثر.
  function keepOversized(el) {
    if (!fits(el)) currentArea.style.overflow = 'visible';
  }

  // يوضع الجدول في الصفحة صفّاً صفّاً، ويتكرر رأسه في كل صفحة. ويبقى الرأس
  // داخل tbody نفسه ليستمر تلوين الصفوف بالتناوب كما هو.
  function appendTable(table) {
    var all = Array.prototype.slice.call(table.rows);
    if (all.length < 2) { appendAtomic(table); return; }

    var header = all[0];
    var bodyRows = all.slice(1);
    var i = 0;

    while (i < bodyRows.length) {
      var chunk = document.createElement("table");
      var tbody = document.createElement("tbody");
      chunk.appendChild(tbody);
      tbody.appendChild(header.cloneNode(true));
      currentArea.appendChild(chunk);

      var placed = 0;
      while (i < bodyRows.length) {
        var row = bodyRows[i].cloneNode(true);
        tbody.appendChild(row);
        if (fits(chunk)) { placed++; i++; continue; }

        if (placed === 0 && currentArea.firstChild === chunk) {
          // صفٌّ أطول من صفحةٍ فارغة: لا يُسقط، فإسقاطه هو ما نمنعه هنا.
          keepOversized(chunk);
          placed++; i++;
        } else {
          tbody.removeChild(row);
        }
        break;
      }

      if (placed === 0) {
        currentArea.removeChild(chunk);
        currentArea = newPage();
        continue;
      }
      if (i < bodyRows.length) currentArea = newPage();
    }
  }

  // والقوائم مثل الجداول: تُقسم عند البند لا تُقصّ.
  function appendList(list) {
    var items = Array.prototype.slice.call(list.children);
    if (items.length < 2) { appendAtomic(list); return; }

    var i = 0;
    while (i < items.length) {
      var chunk = document.createElement(list.tagName);
      currentArea.appendChild(chunk);

      var placed = 0;
      while (i < items.length) {
        var item = items[i].cloneNode(true);
        chunk.appendChild(item);
        if (fits(chunk)) { placed++; i++; continue; }

        if (placed === 0 && currentArea.firstChild === chunk) {
          keepOversized(chunk);
          placed++; i++;
        } else {
          chunk.removeChild(item);
        }
        break;
      }

      if (placed === 0) {
        currentArea.removeChild(chunk);
        currentArea = newPage();
        continue;
      }
      if (i < items.length) currentArea = newPage();
    }
  }

  // ما لا موضع يُقسم عنده يُنقل كاملاً إلى الصفحة التالية.
  function appendAtomic(el) {
    currentArea.appendChild(el);
    if (fits(el)) return;
    if (currentArea.firstChild !== el) {
      currentArea.removeChild(el);
      currentArea = newPage();
      currentArea.appendChild(el);
    }
    keepOversized(el);
  }

  function appendToPage(el) {
    var tag = el.tagName;
    if (tag === "TABLE") appendTable(el);
    else if (tag === "UL" || tag === "OL") appendList(el);
    else appendAtomic(el);
  }

  nodes.forEach(function(node) {
    if (node.nodeType === 3) {
      if (node.textContent.trim()) {
        var p = document.createElement('p');
        p.textContent = node.textContent;
        appendToPage(p);
      }
    } else if (node.nodeType === 1) {
      appendToPage(node);
    }
  });

  if (shouldPrint) {
    setTimeout(function() { window.print(); }, 300);
  }
  }

  // Cairo loads via @import, and nothing on the page asks for it until this
  // script runs — #root starts empty, so the browser has not even begun
  // fetching it yet. Measuring immediately measures with
  // the fallback font (Segoe UI/Tahoma), which wraps Arabic text at
  // different widths than Cairo. Page breaks get decided on those wrong
  // heights, then the real Cairo text reflows taller or shorter inside the
  // already-fixed, already-clipped content-area — the same meeting prints
  // clean sometimes and drops or blanks a row other times, purely depending
  // on how fast the font happened to load that time. Forcing every weight
  // actually used (400 body, 600 label, 700 titles/headers) to finish
  // loading before measuring anything removes that race.
  var fontsReady = (document.fonts && document.fonts.ready)
    ? Promise.all(['400', '600', '700'].map(function(w) {
        return document.fonts.load(w + ' 12px Cairo').catch(function() {});
      })).then(function() { return document.fonts.ready; })
    : Promise.resolve();

  var started = false;
  function start() {
    if (started) return;
    started = true;
    runLayout();
  }
  fontsReady.then(start, start);
  setTimeout(start, 1500);
})();
</script>
</body></html>`;
}

export function handlePrint(m: Meeting, meetingNum?: number) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    notify("error", "تعذر فتح نافذة الطباعة. يرجى التحقق من إعدادات المتصفح.");
    return;
  }

  doc.open();
  doc.write(buildLetterheadDoc(m, true, meetingNum));
  doc.close();

  // Cleanup after printing is complete (the script inside handles window.print())
  setTimeout(() => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }, 5000);
}

export function handlePreview(m: Meeting, meetingNum?: number) {
  const win = window.open("", "_blank");
  if (!win) {
    notify("error", "الرجاء السماح بفتح النوافذ المنبثقة (Popups) لعرض الكليشة.");
    return;
  }
  win.document.open();
  win.document.write(buildLetterheadDoc(m, false, meetingNum));
  win.document.close();
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
  return (cleaned || "بدون عنوان").slice(0, 120);
}

// Downloads a ZIP with one folder per service (meetingContext), each containing
// that service's meetings as printable letterhead HTML files named by number + title.
export async function downloadAllMeetingsZip(
  meetings: Meeting[],
  meetingNumberMap: Map<string, number>
) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  for (const m of meetings) {
    const folderName = sanitizeFileName(m.meetingContext || "بدون خدمة");
    const num = meetingNumberMap.get(m.id);
    const numStr = num ? `ZAD_M_${String(num).padStart(3, "0")}` : "";
    const fileName = `${sanitizeFileName(`${numStr ? numStr + " - " : ""}${m.title}`)}.html`;
    const html = buildLetterheadDoc(m, false, num);
    zip.folder(folderName)?.file(fileName, html);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `محاضر الاجتماعات - ${new Date().toLocaleDateString("ar-SA")}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
