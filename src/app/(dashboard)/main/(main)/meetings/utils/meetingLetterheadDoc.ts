// صفحةُ المحضر بالكليشة (HTML) — للعرض والطباعة في المتصفّح، ولتوليد PDF على
// الخادم. منطقٌ خالصٌ بلا واجهة، فيُستورد من الجهتين.

import type { Meeting } from "../MeetingsClient";
import { meetingAssigneeName } from "./meetingAssignee";
import { LETTERHEAD_CSS } from "@/lib/letterhead";
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

  const safeBody = JSON.stringify(body).replace(/<\/(script)/ig, "<\\/$1");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><title>${escapeHtml(m.title)}</title>
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

  // علامةُ اكتمال التخطيط — مولِّدُ PDF على الخادم ينتظرها.
  document.body.setAttribute("data-ready", "1");

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
