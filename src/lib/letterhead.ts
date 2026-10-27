/**
 * نمطُ الكليشة — صفحةُ A4 بخلفية `/assets/letterhead.png` ومنطقةُ محتواها.
 *
 * ومشتركٌ بين محضر الاجتماع والطلب المالي: الصفحةُ واحدةٌ — المقاسُ والهوامشُ
 * وموضعُ الرقم والتاريخ ومنطقةُ المحتوى بين ٥٠مم و٥٥مم — فنسختان منها تفترقان
 * عند أوّل تعديلٍ في واحدة، ويطبع المستندان على كليشتين مختلفتين.
 *
 * والقيمُ هنا كما كانت في `meetingPrint.ts` حرفاً بحرف، فالمحضر يطبع كما كان.
 */
export const LETTERHEAD_CSS = `
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
