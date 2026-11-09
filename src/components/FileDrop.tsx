"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip } from "lucide-react";
import { notify } from "@/components/console/toastBus";

/**
 * إرفاق الملفات بالسحب والإفلات.
 *
 * على مستوى الصفحة لا عنصر بعينه: ملفٌّ يسقط خارج النافذة يفتحه المتصفح مكان
 * الموقع فتضيع الرسالة المكتوبة. وعلى طور الالتقاط، ليُمسك قبل أن يصل محرر
 * النص فيُدرج الملف داخله.
 *
 * ولا يتدخّل إلا في سحب ملفٍّ من خارج الصفحة: سحب نصٍّ أو صورةٍ داخل المحرر
 * يبقى للمحرر. والصورة المسحوبة داخل الصفحة يصفها المتصفح بـ"Files" أيضاً،
 * فالفيصل أن السحب الداخلي يبدأ بحدث dragstart، وسحب الملف من الجهاز لا يبدأ به.
 */
export function useFileDrop(onFiles: (files: File[]) => void, enabled = true): boolean {
  const [dragging, setDragging] = useState(false);
  const onFilesRef = useRef(onFiles);
  useEffect(() => {
    onFilesRef.current = onFiles;
  });

  useEffect(() => {
    if (!enabled) return;

    // dragenter وdragleave يتكرران مع كل عنصرٍ يمرّ فوقه المؤشر، فالعدّ هو ما
    // يميّز خروجه من الصفحة حقاً عن انتقاله بين عنصرين.
    let depth = 0;
    let internalDrag = false;

    const isFileDrag = (e: DragEvent) => !internalDrag && !!e.dataTransfer?.types.includes("Files");

    const onDragStart = () => {
      internalDrag = true;
    };
    const onDragEnd = () => {
      internalDrag = false;
    };
    const onDragEnter = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      depth += 1;
      setDragging(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.dataTransfer!.dropEffect = "copy";
    };
    const onDragLeave = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!isFileDrag(e)) {
        internalDrag = false;
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      depth = 0;
      setDragging(false);

      // المجلد يصل ملفاً بلا محتوى، فيفشل رفعه بخطأٍ لا يُفهم.
      const entries = Array.from(e.dataTransfer!.items).filter((item) => item.kind === "file");
      const files = entries
        .filter((item) => !item.webkitGetAsEntry?.()?.isDirectory)
        .map((item) => item.getAsFile())
        .filter((file): file is File => !!file);

      if (files.length < entries.length) notify("error", "المجلدات لا تُرفق — اسحب الملفات نفسها");
      if (files.length > 0) onFilesRef.current(files);
    };

    document.addEventListener("dragstart", onDragStart, true);
    document.addEventListener("dragend", onDragEnd, true);
    document.addEventListener("dragenter", onDragEnter, true);
    document.addEventListener("dragover", onDragOver, true);
    document.addEventListener("dragleave", onDragLeave, true);
    document.addEventListener("drop", onDrop, true);
    return () => {
      setDragging(false);
      document.removeEventListener("dragstart", onDragStart, true);
      document.removeEventListener("dragend", onDragEnd, true);
      document.removeEventListener("dragenter", onDragEnter, true);
      document.removeEventListener("dragover", onDragOver, true);
      document.removeEventListener("dragleave", onDragLeave, true);
      document.removeEventListener("drop", onDrop, true);
    };
  }, [enabled]);

  return dragging;
}

/** طبقةٌ فوق النافذة أثناء السحب. يوضع داخل عنصرٍ `relative`. */
export function FileDropOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute inset-2 z-20 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary bg-primary/10 text-primary backdrop-blur-sm dark:text-teal-300">
      <Paperclip className="w-7 h-7" />
      <p className="text-body font-semibold">أفلت الملفات هنا لإرفاقها</p>
    </div>
  );
}
