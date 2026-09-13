"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Folder,
  FolderPlus,
  FileUp,
  Trash2,
  Pencil,
  ChevronLeft,
  Home,
  Loader2,
  AlertTriangle,
  Download,
  FileText,
  FileImage,
  FileArchive,
  Search,
  X,
  LayoutGrid,
  List,
  ArrowUpDown,
  Check,
  FolderInput,
  CornerUpLeft,
} from "lucide-react";
import {
  listTemplateFolder,
  createTemplateFolder,
  addTemplateFiles,
  renameTemplateNode,
  deleteTemplateNode,
  searchTemplateLibrary,
  moveTemplateNodes,
  type TemplateNodeRow,
  type TemplateSearchRow,
} from "@/app/actions/templateLibrary";
import { uploadFiles } from "@/lib/clientUpload";
import { ACCEPT_ATTRIBUTE, formatBytes, maxBytesFor, maxLabelFor } from "@/lib/uploadPurposes";
import ConfirmModal from "@/components/ui/ConfirmModal";
import SuccessToast from "@/components/ui/SuccessToast";

const MAX_BYTES = maxBytesFor("template_file");
const MAX_LABEL = maxLabelFor("template_file");

type ViewMode = "grid" | "list";
type SortKey = "name" | "date" | "size";

/**
 * View and sort are per-device preferences, not per-account: the same person
 * wants a dense list on a laptop and cards on a phone. localStorage keeps each
 * device on what it was left, and nothing has to reach the server to find out.
 */
const VIEW_KEY = "zad_tl_view";
const SORT_KEY = "zad_tl_sort";

/**
 * The root has no id — it is the rows whose parentId is null — so it needs a
 * value of its own to be a drop target: null already means "nothing is hovered",
 * and one field cannot carry both meanings.
 */
const ROOT_TARGET = "__root__";

function readStored<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    // Private windows and blocked site data throw on access, not on read.
    return fallback;
  }
}

/**
 * A preference kept in localStorage.
 *
 * Read through useSyncExternalStore rather than by setting state in an effect:
 * the server has no localStorage, so the stored value has to arrive as a
 * snapshot React knows differs between server and client. Setting it from an
 * effect instead paints the default first and then jumps — which is what the
 * lint rule against setState-in-effect is pointing at.
 */
function useStoredChoice<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[]
): [T, (v: T) => void] {
  const [override, setOverride] = useState<T | null>(null);

  const stored = useSyncExternalStore(
    () => () => {}, // nothing outside this component changes it
    () => readStored(key, fallback, allowed),
    () => fallback // server render
  );

  const set = (v: T) => {
    setOverride(v);
    try {
      window.localStorage.setItem(key, v);
    } catch {
      // Storage can be blocked; the choice still applies for this session.
    }
  };

  return [override ?? stored, set];
}

function iconFor(name: string) {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return FileImage;
  if (["zip", "rar"].includes(ext)) return FileArchive;
  return FileText;
}

/**
 * A file browser over the template library.
 *
 * Navigation is one folder at a time and each step refetches that level, rather
 * than loading the whole tree and walking it in memory: the library is meant to
 * grow, and the second approach gets slower with every file anyone adds.
 *
 * Selection and moving follow Windows Explorer, because that is the program
 * every user here already knows: a click selects, Ctrl adds, Shift takes a
 * range, and dragging carries the whole selection into a folder — or onto a
 * breadcrumb to send it back up. What Explorer does with a mouse it cannot do
 * on a phone, so the same move is also on the «نقل إلى» menu of the selection
 * bar: drag-and-drop has no touch equivalent, and without that menu every
 * tablet would be left unable to move a single file.
 */
export default function TemplateLibraryClient() {
  const [rows, setRows] = useState<TemplateNodeRow[]>([]);
  const [path, setPath] = useState<{ id: string; name: string }[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<TemplateNodeRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [uploadStatus, setUploadStatus] = useState("");

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<TemplateSearchRow[]>([]);
  // Which query the results in hand answer. Comparing it with what is typed is
  // what "still searching" means, so no flag has to be flipped as the effect
  // starts.
  const [resultsFor, setResultsFor] = useState<string | null>(null);

  // ── التحديد والسحب ────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** مِرساة نطاق Shift: آخر عنصر حُدِّد بنقرة مجرّدة. */
  const [anchorId, setAnchorId] = useState<string | null>(null);
  /** ما يُحمَل الآن. null = لا سحب جارياً. */
  const [dragIds, setDragIds] = useState<string[] | null>(null);
  /** الهدف المُحوَّم فوقه: معرّف مجلد، أو ROOT_TARGET، أو null لا شيء. */
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  /** إطار التحديد بالفأرة، بإحداثيات سطح العرض. null = لا سحب تحديد. */
  const [band, setBand] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  /** عقدة كل صف، لقياس صندوقه ومعرفة ما يمسّه الإطار. */
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const bandStart = useRef<{ x: number; y: number } | null>(null);
  /** التحديد قبل بداية الإطار — يُبنى عليه حين يُسحَب الإطار وCtrl مضغوط. */
  const bandBase = useRef<Set<string>>(new Set());
  /** هل تحرّك الإطار فعلاً؟ نقرةٌ ساكنة تُلغي التحديد، وسحبةٌ لا. */
  const didBand = useRef(false);

  const [view, chooseView] = useStoredChoice<ViewMode>(VIEW_KEY, "grid", ["grid", "list"] as const);
  const [sort, setSortKey] = useStoredChoice<SortKey>(SORT_KEY, "name", ["name", "date", "size"] as const);
  const [sortAsc, setSortAsc] = useState(true);

  // Clicking the active column flips direction, the way every file browser
  // behaves; clicking a different one starts ascending.
  const chooseSort = (k: SortKey) => {
    if (k === sort) { setSortAsc((a) => !a); return; }
    setSortKey(k);
    setSortAsc(true);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (folderId: string | null) => {
    setIsLoading(true);
    setError(null);
    // التحديد يسقط مع كل تحميل: ما حُدِّد في مجلد لا معنى له في غيره، وبقاؤه
    // يجعل «نقل إلى» يعمل على ما لم يبقَ معروضاً.
    setSelected(new Set());
    setAnchorId(null);
    const res = await listTemplateFolder(folderId);
    if (res.ok) {
      setRows(res.rows);
      setPath(res.path);
    } else {
      setError(res.error);
      setRows([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load(currentId);
  }, [currentId, load]);

  const refresh = () => load(currentId);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    const res = await createTemplateFolder(currentId, name);
    if (res.error) return setError(res.error);
    setNewFolderName("");
    setIsCreatingFolder(false);
    setToast("تم إنشاء المجلد");
    refresh();
  };

  const handleUpload = async (picked: File[]) => {
    if (!picked.length) return;
    setError(null);

    const tooBig = picked.filter((f) => f.size > MAX_BYTES);
    if (tooBig.length) {
      // Nothing uploads unless every file is acceptable — a partial upload is
      // how attachments quietly go missing.
      return setError(`تجاوز الحد (${MAX_LABEL}): ${tooBig.map((f) => f.name).join("، ")}`);
    }

    setUploadStatus("جارٍ التجهيز…");
    try {
      const uploaded = await uploadFiles(picked, "template_file", (p) =>
        setUploadStatus(
          p.total > 1
            ? `جارٍ رفع ${p.index} من ${p.total}: ${p.fileName}${p.percent !== null ? ` — ${p.percent}%` : ""}`
            : `جارٍ الرفع${p.percent !== null ? ` — ${p.percent}%` : ""}`
        )
      );
      const res = await addTemplateFiles(currentId, uploaded);
      if (res.error) return setError(res.error);
      setToast(uploaded.length === 1 ? "تم رفع الملف" : `تم رفع ${uploaded.length} ملفات`);
      refresh();
    } catch (err) {
      // Cloudinary own reason, not a generic failure.
      setError(err instanceof Error ? err.message : "تعذّر رفع الملف");
    } finally {
      setUploadStatus("");
    }
  };

  const handleRename = async (id: string) => {
    const name = renameValue.trim();
    if (!name) return setRenamingId(null);
    const res = await renameTemplateNode(id, name);
    if (res.error) return setError(res.error);
    setRenamingId(null);
    setToast("تم تغيير الاسم");
    refresh();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    const res = await deleteTemplateNode(deleting.id);
    setIsDeleting(false);
    if (res.error) {
      setDeleting(null);
      return setError(res.error);
    }
    setDeleting(null);
    setToast(deleting.kind === "FOLDER" ? "تم حذف المجلد ومحتوياته" : "تم حذف الملف");
    refresh();
  };

  // Search mode is derived from what is typed rather than stored in a flag, so
  // clearing the box restores the folder listing with no state change at all.
  const query = search.trim();
  const isSearchMode = query.length >= 2;
  const isSearching = isSearchMode && resultsFor !== query;

  useEffect(() => {
    if (query.length < 2) return;
    // Debounced: the query walks a recursive CTE, and firing it per keystroke
    // would run it a dozen times to answer the last one.
    const timer = setTimeout(async () => {
      const res = await searchTemplateLibrary(currentId, query);
      if (res.ok) setSearchResults(res.rows);
      else { setError(res.error); setSearchResults([]); }
      setResultsFor(query);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, currentId]);

  const displayed: (TemplateNodeRow & { parentName?: string | null })[] =
    isSearchMode ? searchResults : rows;

  const sorted = [...displayed].sort((a, b) => {
    // Folders always lead, whichever column is sorted — the same rule every
    // file browser follows, and the reason a folder never hides among files.
    if (a.kind !== b.kind) return a.kind === "FOLDER" ? -1 : 1;
    let cmp = 0;
    if (sort === "name") cmp = a.name.localeCompare(b.name, "ar");
    else if (sort === "date") cmp = a.createdAt.localeCompare(b.createdAt);
    else cmp = (a.fileSize ?? 0) - (b.fileSize ?? 0);
    return sortAsc ? cmp : -cmp;
  });

  // ── التحديد ───────────────────────────────────────────────────────────────

  const clearSelection = () => { setSelected(new Set()); setAnchorId(null); };

  /**
   * نقرة على عنصر: مجرّدةٌ تُفرِد التحديد، وCtrl تُبدّل، وShift تأخذ نطاقاً من
   * المِرساة إلى هنا بترتيب المعروض — ترتيب ما تراه العين لا ترتيب الجَلْب،
   * وإلا حدّد Shift شيئاً غير الذي بين العنصرين على الشاشة.
   */
  const handlePick = (
    e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
    id: string
  ) => {
    if (e.shiftKey && anchorId) {
      const from = sorted.findIndex((r) => r.id === anchorId);
      const to = sorted.findIndex((r) => r.id === id);
      if (from !== -1 && to !== -1) {
        const [lo, hi] = from <= to ? [from, to] : [to, from];
        setSelected(new Set(sorted.slice(lo, hi + 1).map((r) => r.id)));
        return;
      }
    }
    if (e.ctrlKey || e.metaKey) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setAnchorId(id);
      return;
    }
    setSelected(new Set([id]));
    setAnchorId(id);
  };

  // الاختصارات مربوطةٌ بمفتاحٍ نصّي لقائمة المعروض لا بالمصفوفة: المصفوفة
  // جديدة في كل رسم، فربط التأثير بها يعيد تسجيل المستمع بلا سبب.
  const idsKey = sorted.map((r) => r.id).join(",");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      // لا يُسرَق Ctrl+A من حقل بحث أو إعادة تسمية.
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "Escape") { setSelected(new Set()); setAnchorId(null); }
      if ((e.key === "a" || e.key === "A") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSelected(new Set(idsKey ? idsKey.split(",") : []));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idsKey]);

  // ── النقل ─────────────────────────────────────────────────────────────────

  const move = async (ids: string[], targetId: string | null) => {
    if (!ids.length) return;
    setError(null);
    setIsMoving(true);
    const res = await moveTemplateNodes(ids, targetId);
    setIsMoving(false);
    if (res.error) return setError(res.error);
    if (!res.moved) return setToast("العناصر في مكانها أصلاً");
    setToast(
      `تم نقل ${res.moved} عنصر` +
        (res.renamed ? ` — أُعيدت تسمية ${res.renamed} لتشابه الأسماء` : "")
    );
    refresh();
  };

  /** إفلاتٌ على مجلد أو على درجة في المسار. targetId: null يعني الجذر. */
  const dropOn = (targetId: string | null) => {
    const ids = dragIds ?? [...selected];
    setDragIds(null);
    setDropTarget(null);
    move(ids, targetId);
  };

  const beginDrag = (e: React.DragEvent, id: string) => {
    // سحب عنصر غير محدَّد يعني قصده وحده — كما في مستعرض الملفات، حيث لا يحمل
    // السحب تحديداً قديماً لم يقصده صاحبه.
    const ids = selected.has(id) ? [...selected] : [id];
    if (!selected.has(id)) {
      setSelected(new Set(ids));
      setAnchorId(id);
    }
    setDragIds(ids);
    e.dataTransfer.effectAllowed = "move";
    // فَيَرفُكس لا يبدأ سحباً بلا بيانات مرفقة.
    try {
      e.dataTransfer.setData("text/plain", ids.join(","));
    } catch {
      // متصفح صارم — السحب يعمل بالحالة وحدها.
    }
  };

  const allowDrop = (e: React.DragEvent, key: string) => {
    if (!dragIds) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    // شرط المساواة يمنع إعادة رسم على كل حركة مؤشّر داخل الهدف نفسه.
    if (dropTarget !== key) setDropTarget(key);
  };

  const leaveDrop = (e: React.DragEvent, key: string) => {
    // الخروج إلى عنصر داخل الهدف ليس خروجاً منه — بدون هذا الفحص يرتجف
    // الإبراز بين الأيقونة والاسم.
    const to = e.relatedTarget as Node | null;
    if (to && e.currentTarget.contains(to)) return;
    if (dropTarget === key) setDropTarget(null);
  };

  // ── إطار التحديد بالفأرة ──────────────────────────────────────────────────

  /**
   * سحبةٌ على الفراغ تُحدّد كل ما يمسّه الإطار، كما في مستعرض الملفات.
   *
   * تبدأ من الفراغ وحده: السحبة من فوق عنصر نقلٌ لا تحديد، وهذا الفرق هو ما
   * يجعل الإيماءتين تتعايشان على السطح نفسه. ولذلك يحمل السطح والشبكة داخله
   * سمة data-surface، وهي التي يُعرَف بها أن الضغط بدأ من فراغٍ لا من بطاقة.
   */
  const beginBand = (e: React.MouseEvent<HTMLDivElement>) => {
    didBand.current = false;
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).dataset.surface === undefined) return;
    const surface = surfaceRef.current;
    if (!surface) return;

    // إحداثيات الصفحة لا النافذة: لو تدحرجت الصفحة أثناء السحب، لانزلق الإطار
    // عن العناصر لو كان مقيساً بالنافذة.
    const start = { x: e.pageX, y: e.pageY };
    bandStart.current = start;
    bandBase.current = e.ctrlKey || e.metaKey ? new Set(selected) : new Set();
    e.preventDefault(); // يمنع تحديد النص أثناء السحب

    const onMove = (ev: MouseEvent) => {
      if (!bandStart.current) return;
      const dx = Math.abs(ev.pageX - start.x);
      const dy = Math.abs(ev.pageY - start.y);
      // عتبة: نقرةٌ فيها رجفة يد ليست سحبة، وبدونها يبتلع الإطار كل نقرة.
      if (!didBand.current && dx < 4 && dy < 4) return;
      didBand.current = true;

      const left = Math.min(start.x, ev.pageX);
      const top = Math.min(start.y, ev.pageY);
      const width = dx;
      const height = dy;

      const box = surface.getBoundingClientRect();
      setBand({
        left: left - (box.left + window.scrollX),
        top: top - (box.top + window.scrollY),
        width,
        height,
      });

      const hits = new Set(bandBase.current);
      for (const [id, node] of rowRefs.current) {
        const r = node.getBoundingClientRect();
        const x1 = r.left + window.scrollX;
        const y1 = r.top + window.scrollY;
        // تماسٌّ لا احتواء: مستعرض الملفات يحدّد ما يمسّه الإطار ولو بطرفه،
        // ولا يشترط أن يحيط به.
        if (x1 < left + width && x1 + r.width > left && y1 < top + height && y1 + r.height > top) {
          hits.add(id);
        }
      }
      setSelected(hits);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      bandStart.current = null;
      setBand(null);
    };

    // على النافذة لا على السطح: اليد تخرج عن حدود القائمة أثناء السحب، ولو
    // كان المستمع على السطح لبقي الإطار معلّقاً عند أول خروج.
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  /** نقرةٌ على الفراغ تُلغي التحديد — إلا إذا كانت نهاية سحبة إطار. */
  const handleSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (didBand.current) { didBand.current = false; return; }
    if ((e.target as HTMLElement).dataset.surface !== undefined) clearSelection();
  };

  /** مقاصد قائمة «نقل إلى» — بديل السحب على اللمس. */
  const parentOfCurrent = path.length >= 2 ? path[path.length - 2] : null;
  const moveTargets: { id: string | null; label: string }[] = [
    ...(currentId !== null ? [{ id: null as string | null, label: "الجذر — مكتبة النماذج" }] : []),
    ...(parentOfCurrent
      ? [{ id: parentOfCurrent.id as string | null, label: `المستوى الأعلى — ${parentOfCurrent.name}` }]
      : []),
    ...sorted
      .filter((r) => r.kind === "FOLDER" && !selected.has(r.id))
      .map((r) => ({ id: r.id as string | null, label: r.name })),
  ];

  const dragCount = dragIds?.length ?? 0;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Breadcrumb + actions */}
      <div className="bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 min-w-0 flex-wrap text-xs font-bold">
          {/* كل درجة في المسار هدف إفلات — وهي الطريقة الوحيدة للنقل إلى
              الأعلى بالسحب، إذ لا يظهر المجلد الأب بين المعروضات. */}
          <button
            onClick={() => setCurrentId(null)}
            onDragOver={(e) => allowDrop(e, ROOT_TARGET)}
            onDragLeave={(e) => leaveDrop(e, ROOT_TARGET)}
            onDrop={(e) => { e.preventDefault(); dropOn(null); }}
            className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              dropTarget === ROOT_TARGET
                ? "bg-primary text-white ring-2 ring-primary/40"
                : currentId === null
                  ? "bg-primary/10 text-primary dark:text-teal-300"
                  : "text-slate-500 hover:bg-primary/5 hover:text-primary"
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            مكتبة النماذج
          </button>
          {path.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1 min-w-0">
              <ChevronLeft className="w-3 h-3 text-slate-300 shrink-0" />
              <button
                onClick={() => setCurrentId(p.id)}
                onDragOver={(e) => allowDrop(e, p.id)}
                onDragLeave={(e) => leaveDrop(e, p.id)}
                onDrop={(e) => { e.preventDefault(); dropOn(p.id); }}
                className={`h-8 px-2.5 rounded-lg truncate max-w-[160px] transition-colors ${
                  dropTarget === p.id
                    ? "bg-primary text-white ring-2 ring-primary/40"
                    : i === path.length - 1
                      ? "bg-primary/10 text-primary dark:text-teal-300"
                      : "text-slate-500 hover:bg-primary/5 hover:text-primary"
                }`}
              >
                {p.name}
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-[#111] text-slate-600 dark:text-slate-300 border border-transparent dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-bold text-xs flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4" />
            مجلد جديد
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!!uploadStatus}
            className="h-9 px-3 rounded-xl text-white bg-gradient-to-b from-[#17857c] via-primary to-[#0c645d] hover:shadow-md active:translate-y-px transition-all font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {uploadStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            رفع ملفات
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(e) => {
              handleUpload(Array.from(e.target.files || []));
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {uploadStatus && (
        <p className="text-xs font-bold text-primary dark:text-teal-300 animate-pulse px-1">{uploadStatus}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={currentId ? "بحث في هذا المجلد وما بداخله…" : "بحث في المكتبة كلها…"}
            className="w-full h-9 ps-9 pe-9 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-primary/30 outline-none text-sm transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="مسح البحث"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl p-1">
          {([
            { key: "name" as SortKey, label: "الاسم" },
            { key: "date" as SortKey, label: "التاريخ" },
            { key: "size" as SortKey, label: "الحجم" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => chooseSort(key)}
              title={sort === key ? (sortAsc ? "تصاعدي — اضغط للعكس" : "تنازلي — اضغط للعكس") : `ترتيب حسب ${label}`}
              className={`h-7 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                sort === key
                  ? "bg-white dark:bg-slate-700 text-primary dark:text-teal-300 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {label}
              {sort === key && <ArrowUpDown className={`w-3 h-3 ${sortAsc ? "" : "rotate-180"}`} />}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl p-1">
          {([
            { key: "grid" as ViewMode, Icon: LayoutGrid, label: "عرض شبكي" },
            { key: "list" as ViewMode, Icon: List, label: "عرض قائمة" },
          ]).map(({ key, Icon, label }) => (
            <button
              key={key}
              onClick={() => chooseView(key)}
              title={label}
              aria-pressed={view === key}
              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                view === key
                  ? "bg-white dark:bg-slate-700 text-primary dark:text-teal-300 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* شريط التحديد — لا يظهر إلا وثمّة محدَّد، فلا يزحم الصفحة في الأصل. */}
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex items-center gap-2 flex-wrap bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur border border-primary/30 rounded-xl px-3 py-2 shadow-sm">
          <span className="text-xs font-bold text-primary dark:text-teal-300 flex items-center gap-1.5">
            {isMoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {isMoving ? "جارٍ النقل…" : `${selected.size} محدَّد`}
          </span>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            اسحبها إلى مجلد — أو انقلها من هنا
          </span>

          <div className="flex items-center gap-2 ms-auto">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <FolderInput className="w-3.5 h-3.5" />
              <select
                value=""
                disabled={isMoving || moveTargets.length === 0}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  move([...selected], v === ROOT_TARGET ? null : v);
                  e.target.value = "";
                }}
                className="h-8 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-primary/40 outline-none text-xs font-bold disabled:opacity-50 max-w-[190px]"
              >
                <option value="">نقل إلى…</option>
                {moveTargets.map((t) => (
                  <option key={t.id ?? ROOT_TARGET} value={t.id ?? ROOT_TARGET}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={() => setSelected(new Set(sorted.map((r) => r.id)))}
              className="h-8 px-2.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              تحديد الكل
            </button>
            <button
              onClick={clearSelection}
              className="h-8 px-2.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              إلغاء
            </button>
          </div>
        </div>
      )}

      {isSearchMode && (
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
          {isSearching
            ? "جارٍ البحث…"
            : `${sorted.length} نتيجة ${currentId ? "في هذا المجلد وما بداخله" : "في المكتبة"}`}
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 font-bold text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      {isCreatingFolder && (
        <div className="flex items-center gap-2 bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 rounded-xl p-2">
          <Folder className="w-4 h-4 text-amber-500 shrink-0 ms-1" />
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
              if (e.key === "Escape") { setIsCreatingFolder(false); setNewFolderName(""); }
            }}
            placeholder="اسم المجلد"
            className="flex-1 h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:border-primary"
          />
          <button onClick={handleCreateFolder} className="h-9 px-4 rounded-lg bg-primary text-white text-xs font-bold">
            إنشاء
          </button>
          <button
            onClick={() => { setIsCreatingFolder(false); setNewFolderName(""); }}
            className="h-9 px-3 rounded-lg text-slate-500 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            إلغاء
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 dark:text-slate-600">
          <Folder className="w-12 h-12 text-slate-300 dark:text-slate-700" />
          <p className="font-bold text-sm">
            {isSearchMode
              ? `لا نتائج لـ«${search.trim()}»`
              : currentId === null
                ? "لا توجد مجلدات بعد — ابدأ بإنشاء مجلد"
                : "هذا المجلد فارغ"}
          </p>
        </div>
      ) : (
        <div
          ref={surfaceRef}
          data-surface=""
          onMouseDown={beginBand}
          onClick={handleSurfaceClick}
          // الفراغ أسفل القائمة ليس حشواً: في عرض القائمة تملأ الصفوف العرض
          // كلَّه، فلا يبقى موضعٌ تبدأ منه سحبة الإطار لولاه.
          className="relative min-h-[300px] pb-10"
        >
          <div
            data-surface=""
            className={
              view === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                : "flex flex-col divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
            }
          >
            {sorted.map((row) => {
              const Icon = row.kind === "FOLDER" ? Folder : iconFor(row.name);
              const isRenaming = renamingId === row.id;
              const isSelected = selected.has(row.id);
              const isDragging = !!dragIds?.includes(row.id);
              const isDropHere = dropTarget === row.id;
              // مجلدٌ محمولٌ الآن ليس هدفاً لنفسه.
              const canAccept = row.kind === "FOLDER" && !!dragIds && !dragIds.includes(row.id);

              return (
                <div
                  key={row.id}
                  ref={(el) => {
                    if (!el) return;
                    rowRefs.current.set(row.id, el);
                    // تنظيفٌ صريح: صفٌّ خرج من العرض لا يبقى صندوقه في الخريطة،
                    // وإلا حدّده الإطار وهو غير معروض أصلاً.
                    return () => { rowRefs.current.delete(row.id); };
                  }}
                  draggable={!isRenaming}
                  onDragStart={(e) => beginDrag(e, row.id)}
                  onDragEnd={() => { setDragIds(null); setDropTarget(null); }}
                  onDragOver={canAccept ? (e) => allowDrop(e, row.id) : undefined}
                  onDragLeave={canAccept ? (e) => leaveDrop(e, row.id) : undefined}
                  onDrop={canAccept ? (e) => { e.preventDefault(); dropOn(row.id); } : undefined}
                  onClick={(e) => handlePick(e, row.id)}
                  className={[
                    view === "grid"
                      ? "group rounded-xl p-3 flex items-center gap-3 border transition-colors"
                      : "group px-3 py-2 flex items-center gap-3 border-0 transition-colors",
                    isDropHere
                      ? "bg-primary/10 border-primary ring-2 ring-primary/30"
                      : isSelected
                        ? "bg-primary/[0.06] dark:bg-primary/10 border-primary/50"
                        : "bg-white dark:bg-[#0A0A0A] border-slate-200 dark:border-slate-800 hover:border-primary/40",
                    isDragging ? "opacity-40" : "",
                    "cursor-default select-none",
                  ].join(" ")}
                >
                  {/* مربّع التحديد ظاهر دائماً: على اللمس لا وجود لـCtrl ولا
                      Shift، فبدونه لا سبيل إلى تحديد أكثر من عنصر. */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePick({ shiftKey: e.shiftKey, ctrlKey: true, metaKey: false }, row.id);
                    }}
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label={isSelected ? `إلغاء تحديد ${row.name}` : `تحديد ${row.name}`}
                    className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-primary border-primary text-white"
                        : "border-slate-300 dark:border-slate-600 text-transparent hover:border-primary"
                    }`}
                  >
                    <Check className="w-3 h-3" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (e.shiftKey || e.ctrlKey || e.metaKey) return handlePick(e, row.id);
                      if (row.kind === "FOLDER") setCurrentId(row.id);
                      else handlePick(e, row.id);
                    }}
                    className="shrink-0 w-10 h-10 rounded-lg bg-slate-50 dark:bg-[#111] flex items-center justify-center"
                  >
                    <Icon
                      className={`w-5 h-5 ${row.kind === "FOLDER" ? "text-amber-500" : "text-primary dark:text-teal-300"}`}
                    />
                  </button>

                  <div className="min-w-0 flex-1">
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(row.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        onBlur={() => handleRename(row.id)}
                        className="w-full h-8 px-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-primary text-sm outline-none"
                      />
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (e.shiftKey || e.ctrlKey || e.metaKey) return handlePick(e, row.id);
                          if (row.kind === "FOLDER") setCurrentId(row.id);
                          else handlePick(e, row.id);
                        }}
                        className="block w-full text-right truncate text-sm font-bold text-slate-800 dark:text-slate-100 hover:text-primary"
                        title={row.name}
                      >
                        {row.name}
                      </button>
                    )}
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {row.kind === "FOLDER"
                        ? `${row.childCount} عنصر`
                        : row.fileSize
                          ? formatBytes(row.fileSize)
                          : "ملف"}
                      {isSearchMode && row.parentName ? ` · في: ${row.parentName}` : ""}
                      {row.createdByName ? ` · ${row.createdByName}` : ""}
                    </p>
                  </div>

                  {/* Always visible.

                      These were opacity-0 until hover, which is a desktop-mouse
                      convention: on a phone or tablet there is no hover, so
                      rename and delete could never be reached at all. Even with
                      a mouse it hid the only way to remove anything behind a
                      gesture nobody is told about. Muted colours keep the card
                      calm without hiding what it can do. */}
                  <div className="flex items-center gap-1 shrink-0">
                    {row.kind === "FILE" && row.fileUrl && (
                      <a
                        href={row.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="فتح"
                        draggable={false}
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(row.id);
                        setRenameValue(row.name);
                      }}
                      title="إعادة تسمية"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleting(row); }}
                      title="حذف"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-rose-400/70 dark:text-rose-400/60 hover:text-white hover:bg-rose-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {band && (
            <div
              className="absolute z-20 pointer-events-none rounded-[2px] border border-primary/70 bg-primary/20"
              style={{ left: band.left, top: band.top, width: band.width, height: band.height }}
            />
          )}
        </div>
      )}

      {/* شارة السحب: كم يتحرّك وإلى أين يُفلَت. ظلّ المتصفح الافتراضي يُظهر
          البطاقة المسحوبة وحدها، فلا يُعرف من تحديدٍ نصفه خارج الشاشة كم
          عنصراً يحمل المؤشّر فعلاً. */}
      {dragCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 dark:bg-slate-100/90 text-white dark:text-slate-900 text-xs font-bold shadow-lg">
          <CornerUpLeft className="w-3.5 h-3.5" />
          نقل {dragCount} عنصر — أفلِتها على مجلد أو على المسار أعلاه
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleting}
        title={deleting?.kind === "FOLDER" ? "حذف المجلد" : "حذف الملف"}
        message={
          deleting?.kind === "FOLDER"
            ? deleting.childCount > 0
              ? `سيُحذف «${deleting.name}» وكل ما بداخله (${deleting.childCount} عنصر) نهائياً، بما فيها الملفات المرفوعة. لا يمكن التراجع.`
              : `سيُحذف المجلد «${deleting.name}». لا يمكن التراجع.`
            : `سيُحذف الملف «${deleting?.name}» نهائياً من التخزين. لا يمكن التراجع.`
        }
        isPending={isDeleting}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />

      <SuccessToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
