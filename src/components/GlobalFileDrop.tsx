"use client";

// الإفلاتُ واللصقُ لكلِّ خانة إرفاقٍ في الموقع — مرّةً واحدةً لا في كلِّ نموذج.
//
// **وخانةُ الإرفاق هي `<input type="file">` نفسُها**: يُوضع فيها الملفُّ المُفلَت
// أو الملصوق ثمّ يُطلق حدثُ `change`، فيجري ما يجري حين يُختار الملفُّ بالنقر —
// الرفعُ والفحصُ والعرض — بلا سطرٍ في أيِّ نموذج. وخانةٌ تُضاف غداً تعمل كذلك.
//
// **وأين يُفلَت؟** على منطقة الخانة نفسِها (زرُّها أو وسمُها)، وتتوهّج كلُّها
// أثناء السحب. أو في أيِّ موضعٍ من نافذةٍ ليس فيها إلا خانةٌ واحدة. ولا تُؤخذ
// خانةٌ من بعيد: ملفٌّ يسقط في صفحةٍ كاملةٍ لا يذهب إلى خانةٍ لم يقصدها صاحبُه.
//
// **واللصقُ** (صورةُ شاشةٍ أو ملفٌّ منسوخ) يذهب إلى الخانة الوحيدة في النافذة
// المفتوحة، أو في الصفحة إن لم تكن نافذة. ولصقُ نصٍّ لا يُمَسّ.
//
// **وما يتولّى إفلاتَه بنفسه** (البريد والمهام ومكتبة النماذج) يُترك له: حدثٌ
// منعه غيرُنا قبلنا لا نلمسه.
//
// وخانةٌ لا يُراد لها ذلك تُعلَّم `data-no-drop`.

import { useEffect } from "react";
import { notify } from "@/components/console/toastBus";

const INPUTS = 'input[type="file"]:not([disabled]):not([data-no-drop])';
const ZONE_ATTR = "data-file-zone";

/** منطقةُ الخانة الظاهرة: وسمُها إن كانت داخله، وإلّا حاويتُها المباشرة (فيها زرُّها). */
function zoneOf(input: HTMLInputElement): HTMLElement | null {
  const zone = input.closest("label") ?? input.parentElement;
  return zone && zone.getClientRects().length > 0 ? zone : null;
}

/** أعلى نافذةٍ مفتوحة — آخرُها في الصفحة هو ما فوق غيره. */
function topDialog(): HTMLElement | null {
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], [aria-modal="true"]')).filter(
    (d) => d.getClientRects().length > 0
  );
  return dialogs[dialogs.length - 1] ?? null;
}

/** الخاناتُ المتاحة الآن: في أعلى نافذةٍ إن وُجدت، وإلّا في الصفحة كلِّها. */
function availableInputs(): HTMLInputElement[] {
  const scope: ParentNode = topDialog() ?? document;
  return Array.from(scope.querySelectorAll<HTMLInputElement>(INPUTS)).filter((i) => zoneOf(i));
}

/** الخانةُ التي يقصدها الإفلاتُ على هذا العنصر، إن قصد واحدة. */
function inputForDrop(target: EventTarget | null): HTMLInputElement | null {
  const inputs = availableInputs();
  const el = target instanceof Element ? target : null;
  if (el) {
    const hit = inputs.find((i) => zoneOf(i)?.contains(el));
    if (hit) return hit;
  }
  // في نافذةٍ ليس فيها إلا خانةٌ واحدة: النافذةُ كلُّها منطقتُها.
  const dialog = topDialog();
  if (dialog && el && dialog.contains(el) && inputs.length === 1) return inputs[0];
  return null;
}

/** هل يقبل الملفَّ وسمُ `accept`؟ (`.pdf`، `image/*`، `application/pdf`) */
function accepts(input: HTMLInputElement, file: File): boolean {
  const rules = input.accept
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  if (!rules.length) return true;
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  return rules.some((r) =>
    r.startsWith(".") ? name.endsWith(r) : r.endsWith("/*") ? type.startsWith(r.slice(0, -1)) : type === r
  );
}

/** يضع الملفاتِ في الخانة ويُطلق `change` — كأنّها اختيرت بالنقر. */
function deliver(input: HTMLInputElement, files: File[]) {
  const fitting = files.filter((f) => accepts(input, f));
  if (fitting.length === 0) {
    notify("error", "نوع الملف غير مقبول في هذه الخانة");
    return;
  }
  if (fitting.length < files.length) notify("error", "بعض الملفات تُركت لأن نوعها غير مقبول هنا");
  const chosen = input.multiple ? fitting : fitting.slice(0, 1);
  const dt = new DataTransfer();
  chosen.forEach((f) => dt.items.add(f));
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

/** ملفاتُ السحب دون المجلدات — المجلدُ يصل ملفاً بلا محتوى. */
function droppedFiles(e: DragEvent): File[] {
  const items = Array.from(e.dataTransfer?.items ?? []).filter((i) => i.kind === "file");
  const files = items
    .filter((i) => !i.webkitGetAsEntry?.()?.isDirectory)
    .map((i) => i.getAsFile())
    .filter((f): f is File => !!f);
  if (files.length < items.length) notify("error", "المجلدات لا تُرفق — اسحب الملفات نفسها");
  return files;
}

export default function GlobalFileDrop() {
  useEffect(() => {
    let depth = 0;
    let internalDrag = false;
    let lit: HTMLElement[] = [];

    const isFileDrag = (e: DragEvent) => !internalDrag && !!e.dataTransfer?.types.includes("Files");

    const light = () => {
      if (lit.length) return;
      lit = availableInputs()
        .map(zoneOf)
        .filter((z): z is HTMLElement => !!z);
      lit.forEach((z) => z.setAttribute(ZONE_ATTR, ""));
    };
    const unlight = () => {
      lit.forEach((z) => z.removeAttribute(ZONE_ATTR));
      lit = [];
      depth = 0;
    };

    const onDragStart = () => {
      internalDrag = true;
    };
    const onDragEnd = () => {
      internalDrag = false;
      unlight();
    };
    const onDragEnter = (e: DragEvent) => {
      if (!isFileDrag(e) || e.defaultPrevented) return;
      depth += 1;
      light();
    };
    const onDragLeave = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) unlight();
    };
    const onDragOver = (e: DragEvent) => {
      if (!isFileDrag(e) || e.defaultPrevented) return;
      // يُمنع دائماً: ملفٌّ يسقط خارج الخانات يفتحه المتصفّحُ مكانَ الصفحة فيضيع ما كُتب.
      e.preventDefault();
      e.dataTransfer!.dropEffect = inputForDrop(e.target) ? "copy" : "none";
    };
    const onDrop = (e: DragEvent) => {
      if (!isFileDrag(e)) {
        internalDrag = false;
        return;
      }
      if (e.defaultPrevented) {
        unlight();
        return;
      }
      e.preventDefault();
      const input = inputForDrop(e.target);
      unlight();
      if (!input) {
        if (availableInputs().length) notify("error", "أفلت الملف على خانة الإرفاق");
        return;
      }
      const files = droppedFiles(e);
      if (files.length) deliver(input, files);
    };

    const onPaste = (e: ClipboardEvent) => {
      if (e.defaultPrevented) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      // لصقُ نصٍّ (ولو صاحبته صورةٌ كما من Word) للخانة التي فيها المؤشّر لا للمرفقات.
      if (!files.length || e.clipboardData?.getData("text/plain")) return;
      const inputs = availableInputs();
      if (inputs.length !== 1) return;
      e.preventDefault();
      deliver(inputs[0], files);
    };

    window.addEventListener("dragstart", onDragStart);
    window.addEventListener("dragend", onDragEnd);
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    return () => {
      unlight();
      window.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("dragend", onDragEnd);
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
  }, []);

  return null;
}
