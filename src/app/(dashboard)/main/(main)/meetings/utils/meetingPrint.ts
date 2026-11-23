import { Meeting } from "../MeetingsClient";
import { notify } from "@/components/console/toastBus";
import { buildLetterheadDoc } from "./meetingLetterheadDoc";

export { buildLetterheadDoc };

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
