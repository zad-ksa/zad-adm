import { Meeting, MeetingTask } from "../MeetingsClient";

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
    const assignee = t.assignedTo?.name || "—";
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

const LETTERHEAD_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #888; font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; direction: rtl; }
  .page { position: relative; width: 210mm; height: 297mm; margin: 8mm auto; overflow: hidden; background: white; }
  .page .letterhead { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: fill; z-index: 0; }
  .page .number-area { position: absolute; top: 14mm; left: 12mm; font-size: 8.5pt; color: #111; z-index: 2; direction: ltr; letter-spacing: 1px; font-family: 'Courier New', monospace; }
  .page .date-area { position: absolute; top: 19mm; left: 12mm; font-size: 8.5pt; color: #111; z-index: 2; direction: ltr; letter-spacing: 1px; font-family: 'Courier New', monospace; }
  .page .content-area { position: absolute; top: 50mm; right: 17mm; left: 17mm; bottom: 55mm; z-index: 2; overflow: hidden; direction: rtl; text-align: right; font-size: 10.5pt; line-height: 1.55; color: #1a1a1a; }
  .meeting-label { text-align: center; font-size: 9pt; font-weight: 600; color: #0f766e; margin-bottom: 2px; letter-spacing: 0.5px; }
  .meeting-title { text-align: center; font-size: 13pt; font-weight: 700; color: #1a1a1a; margin-bottom: 10px; border-bottom: 1.5px solid #bfe6e1; padding-bottom: 6px; }
  h2.sec-title { color: #0f766e; font-size: 12pt; font-weight: 700; text-align: center; margin: 8px 0 4px; padding-bottom: 2px; border-bottom: 1.5px solid #bfe6e1; }
  h3.sub-title { color: #0f766e; font-size: 10.5pt; font-weight: 700; text-align: center; margin: 6px 0 3px; }
  h4.sub-title { color: #0f766e; font-size: 10pt; font-weight: 700; margin: 5px 0 2px; }
  p { margin: 2px 0; } br { display: block; margin: 1px 0; }
  ul { list-style: disc; padding-right: 16px; margin: 2px 0 5px; }
  li { margin-bottom: 2px; line-height: 1.45; }
  hr { border: none; border-top: 1px solid #ddd; margin: 5px 0; }
  p.footer-note { text-align: center; color: #64748b; font-size: 9pt; margin: 2px 0; }
  strong { font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 9.5pt; direction: rtl; }
  th, td { border: 1px solid #99c2bd; padding: 4px 8px; text-align: right; vertical-align: top; }
  th { background-color: #e6f2f0; font-weight: 700; color: #0f766e; text-align: center; }
  tr:nth-child(even) td { background-color: #f0f7f6; }
  @page { size: A4; margin: 0; }
  @media print { html, body { background: white !important; } .page { margin: 0 !important; page-break-after: always; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page:last-child { page-break-after: avoid; } }
`;

export function buildLetterheadDoc(m: Meeting, forPrint: boolean, meetingNum?: number): string {
  const rawHtml = mdToHtml(m.formattedContent);
  const cleanHtml = rawHtml.replace(/<h[23][^>]*>.*?(?:مهام|توصيات|تكليفات).*?<\/h[23]>\s*(<table[\s\S]*?<\/table>)/gi, "").replace(/<table[\s\S]*?<\/table>/gi, "");
  const footer = `<p class="footer-note"><em>صدر هذا المحضر عن شركة زاد للخدمات التنموية</em></p><p class="footer-note"><em>محضر إلكتروني عبر موقع زاد</em></p>`;
  const body = `<div class="meeting-label">محضر اجتماع</div><div class="meeting-title">${m.title}</div>\n` + injectTasksIntoHtml(cleanHtml, m.meetingTasks) + "\n" + footer;
  const dateStr = formatDate(m.date);
  const numStr = meetingNum ? `ZAD_M_${String(meetingNum).padStart(3, "0")}` : "";
  const letterheadUrl = `${window.location.origin}/assets/letterhead.png`;

  var safeBody = JSON.stringify(body).replace(/<\/(script)/ig, "<\\/$1");

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
  var PAGE_H = 1123, TOP_OFFSET = 189, BOT_OFFSET = 208;
  var USABLE = PAGE_H - TOP_OFFSET - BOT_OFFSET;
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

  var probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;top:-9999px;right:0;width:176mm;font-family:Cairo,Segoe UI,Tahoma,sans-serif;font-size:10.5pt;line-height:1.55;direction:rtl;';
  document.body.appendChild(probe);

  var currentArea = newPage();
  var usedHeight = 0;

  function getHeight(el) {
    probe.appendChild(el);
    var h = el.offsetHeight || 20;
    probe.removeChild(el);
    return h;
  }

  function place(el, h) {
    currentArea.appendChild(el);
    usedHeight += h;
  }

  // Splits a table across pages, row by row, repeating the header on each.
  //
  // Without this a table is one indivisible node: it is measured whole, moved
  // whole to a fresh page when it does not fit, and then CLIPPED by the
  // content-area overflow:hidden. Nothing warns — the rows past the page edge
  // simply vanish, which is how a meeting with twenty tasks printed twelve.
  //
  // The header clone stays inside the same tbody rather than moving to a thead,
  // so the tr:nth-child striping keeps landing on the same rows it did before.
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

      var placed = 0;
      var avail = USABLE - usedHeight;

      while (i < bodyRows.length) {
        tbody.appendChild(bodyRows[i].cloneNode(true));
        var h = getHeight(chunk);

        if (h <= avail) { placed++; i++; continue; }

        // Does not fit. Keep it anyway if the page is empty and this is the
        // first row — a single row taller than a whole page cannot be split,
        // and dropping it would be the very bug this function exists to fix.
        if (placed === 0 && usedHeight === 0) { placed++; i++; }
        else { tbody.removeChild(tbody.lastChild); }
        break;
      }

      if (placed === 0) {
        // Not even the header plus one row fits in what is left of this page.
        currentArea = newPage(); usedHeight = 0;
        continue;
      }

      place(chunk, getHeight(chunk));
      if (i < bodyRows.length) { currentArea = newPage(); usedHeight = 0; }
    }
  }

  // Same treatment for lists, which overflow the same way once a section of
  // recommendations runs long.
  function appendList(list) {
    var items = Array.prototype.slice.call(list.children);
    if (items.length < 2) { appendAtomic(list); return; }

    var i = 0;
    while (i < items.length) {
      var chunk = document.createElement(list.tagName);
      var placed = 0;
      var avail = USABLE - usedHeight;

      while (i < items.length) {
        chunk.appendChild(items[i].cloneNode(true));
        if (getHeight(chunk) <= avail) { placed++; i++; continue; }
        if (placed === 0 && usedHeight === 0) { placed++; i++; }
        else { chunk.removeChild(chunk.lastChild); }
        break;
      }

      if (placed === 0) { currentArea = newPage(); usedHeight = 0; continue; }

      place(chunk, getHeight(chunk));
      if (i < items.length) { currentArea = newPage(); usedHeight = 0; }
    }
  }

  // Anything with no natural seam to cut along: moved whole to the next page.
  function appendAtomic(el) {
    var h = getHeight(el);
    if (usedHeight + h > USABLE && usedHeight > 0) {
      currentArea = newPage(); usedHeight = 0;
    }
    place(el, h);
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

  document.body.removeChild(probe);

  if (shouldPrint) {
    setTimeout(function() { window.print(); }, 1200);
  }
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
    alert("تعذر فتح نافذة الطباعة. يرجى التحقق من إعدادات المتصفح.");
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
    alert("الرجاء السماح بفتح النوافذ المنبثقة (Popups) لعرض الكليشة.");
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
