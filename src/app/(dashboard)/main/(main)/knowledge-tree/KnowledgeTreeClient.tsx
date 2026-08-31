"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import {
  listKnowledgeFolder,
  createKnowledgeFolder,
  addKnowledgeFiles,
  renameKnowledgeNode,
  deleteKnowledgeNode,
  type KnowledgeNodeRow,
} from "@/app/actions/knowledgeTree";
import { uploadFiles } from "@/lib/clientUpload";
import { ACCEPT_ATTRIBUTE, formatBytes, maxBytesFor, maxLabelFor } from "@/lib/uploadPurposes";
import ConfirmModal from "@/components/ui/ConfirmModal";
import SuccessToast from "@/components/ui/SuccessToast";

const MAX_BYTES = maxBytesFor("knowledge_file");
const MAX_LABEL = maxLabelFor("knowledge_file");

function iconFor(name: string) {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return FileImage;
  if (["zip", "rar"].includes(ext)) return FileArchive;
  return FileText;
}

/**
 * A file browser over the knowledge tree.
 *
 * Navigation is one folder at a time and each step refetches that level, rather
 * than loading the whole tree and walking it in memory: the tree is meant to
 * grow, and the second approach gets slower with every file anyone adds.
 *
 * The previous incarnation of this idea kept its folders in localStorage, so
 * each employee saw only what they themselves had created. Everything here goes
 * through server actions against a real table — which is the entire point of
 * rebuilding it.
 */
export default function KnowledgeTreeClient() {
  const [rows, setRows] = useState<KnowledgeNodeRow[]>([]);
  const [path, setPath] = useState<{ id: string; name: string }[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<KnowledgeNodeRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [uploadStatus, setUploadStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (folderId: string | null) => {
    setIsLoading(true);
    setError(null);
    const res = await listKnowledgeFolder(folderId);
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
    const res = await createKnowledgeFolder(currentId, name);
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
      const uploaded = await uploadFiles(picked, "knowledge_file", (p) =>
        setUploadStatus(
          p.total > 1
            ? `جارٍ رفع ${p.index} من ${p.total}: ${p.fileName}${p.percent !== null ? ` — ${p.percent}%` : ""}`
            : `جارٍ الرفع${p.percent !== null ? ` — ${p.percent}%` : ""}`
        )
      );
      const res = await addKnowledgeFiles(currentId, uploaded);
      if (res.error) return setError(res.error);
      setToast(uploaded.length === 1 ? "تم رفع الملف" : `تم رفع ${uploaded.length} ملفات`);
      refresh();
    } catch (err) {
      // Cloudinary's own reason, not a generic failure.
      setError(err instanceof Error ? err.message : "تعذّر رفع الملف");
    } finally {
      setUploadStatus("");
    }
  };

  const handleRename = async (id: string) => {
    const name = renameValue.trim();
    if (!name) return setRenamingId(null);
    const res = await renameKnowledgeNode(id, name);
    if (res.error) return setError(res.error);
    setRenamingId(null);
    setToast("تم تغيير الاسم");
    refresh();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    const res = await deleteKnowledgeNode(deleting.id);
    setIsDeleting(false);
    if (res.error) {
      setDeleting(null);
      return setError(res.error);
    }
    setDeleting(null);
    setToast(deleting.kind === "FOLDER" ? "تم حذف المجلد ومحتوياته" : "تم حذف الملف");
    refresh();
  };

  const folders = rows.filter((r) => r.kind === "FOLDER");
  const files = rows.filter((r) => r.kind === "FILE");

  return (
    <div className="space-y-4" dir="rtl">
      {/* Breadcrumb + actions */}
      <div className="bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 min-w-0 flex-wrap text-xs font-bold">
          <button
            onClick={() => setCurrentId(null)}
            className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              currentId === null
                ? "bg-primary/10 text-primary dark:text-teal-300"
                : "text-slate-500 hover:bg-primary/5 hover:text-primary"
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            شجرة المعرفة
          </button>
          {path.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1 min-w-0">
              <ChevronLeft className="w-3 h-3 text-slate-300 shrink-0" />
              <button
                onClick={() => setCurrentId(p.id)}
                className={`h-8 px-2.5 rounded-lg truncate max-w-[160px] transition-colors ${
                  i === path.length - 1
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
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 dark:text-slate-600">
          <Folder className="w-12 h-12 text-slate-300 dark:text-slate-700" />
          <p className="font-bold text-sm">
            {currentId === null ? "لا توجد مجلدات بعد — ابدأ بإنشاء مجلد" : "هذا المجلد فارغ"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...folders, ...files].map((row) => {
            const Icon = row.kind === "FOLDER" ? Folder : iconFor(row.name);
            const isRenaming = renamingId === row.id;

            return (
              <div
                key={row.id}
                className="group bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3 hover:border-primary/40 transition-colors"
              >
                <button
                  onClick={() => row.kind === "FOLDER" && setCurrentId(row.id)}
                  disabled={row.kind !== "FOLDER"}
                  className="shrink-0 w-10 h-10 rounded-lg bg-slate-50 dark:bg-[#111] flex items-center justify-center disabled:cursor-default"
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
                      onClick={() => row.kind === "FOLDER" && setCurrentId(row.id)}
                      disabled={row.kind !== "FOLDER"}
                      className="block w-full text-right truncate text-sm font-bold text-slate-800 dark:text-slate-100 disabled:cursor-default hover:text-primary disabled:hover:text-slate-800 dark:disabled:hover:text-slate-100"
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
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => { setRenamingId(row.id); setRenameValue(row.name); }}
                    title="إعادة تسمية"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleting(row)}
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
