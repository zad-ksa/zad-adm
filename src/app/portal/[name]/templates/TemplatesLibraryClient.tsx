"use client";

import { useState, useTransition } from "react";
import {
  ChevronLeft,
  Download,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  Search,
  X,
} from "lucide-react";
import {
  listKnowledgeFolder,
  searchKnowledgeTree,
  type KnowledgeNodeRow,
  type KnowledgeSearchRow,
} from "@/app/actions/knowledgeTree";

/**
 * The templates library, as a charity sees it: browse and download, nothing else.
 *
 * Written as its own screen rather than the staff browser with a `readOnly`
 * flag threaded through it. That browser carries create, rename, upload and
 * delete; a flag guarding all four is one wrong default away from handing a
 * charity a delete button. Here those calls do not exist to be reached — and
 * the server refuses them anyway, since the four mutations keep the strict
 * guard that rejects every charity account.
 */

type Crumb = { id: string; name: string };

const fmtSize = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} كيلو`;
  return `${(bytes / 1048576).toFixed(1)} ميقا`;
};

export default function TemplatesLibraryClient({
  initialRows,
  initialPath,
}: {
  initialRows: KnowledgeNodeRow[];
  initialPath: Crumb[];
}) {
  const [rows, setRows] = useState<KnowledgeNodeRow[]>(initialRows);
  const [path, setPath] = useState<Crumb[]>(initialPath);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeSearchRow[] | null>(null);
  const [searching, setSearching] = useState(false);

  const open = (id: string | null) => {
    setError(null);
    setResults(null);
    setQuery("");
    startTransition(async () => {
      const res = await listKnowledgeFolder(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRows(res.rows);
      setPath(res.path);
    });
  };

  const runSearch = async () => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      // Scoped to the folder in view: searching from inside a folder searches
      // that folder, which is what a person standing in it expects.
      const res = await searchKnowledgeTree(path.at(-1)?.id ?? null, q);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResults(res.rows);
    } finally {
      setSearching(false);
    }
  };

  const shown: (KnowledgeNodeRow & { parentName?: string | null })[] = results ?? rows;
  const isSearch = results !== null;

  return (
    <div className="space-y-4" dir="rtl">
      {/* المسار */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => open(null)}
          disabled={pending}
          className="text-[13px] font-bold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors inline-flex items-center gap-1.5"
        >
          <FolderOpen className="w-4 h-4" />
          المكتبة
        </button>
        {path.map((c, i) => (
          <span key={c.id} className="flex items-center gap-2">
            <ChevronLeft className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
            <button
              onClick={() => open(c.id)}
              disabled={pending || i === path.length - 1}
              className={`text-[13px] font-bold transition-colors ${
                i === path.length - 1
                  ? "text-slate-900 dark:text-slate-100"
                  : "text-slate-500 dark:text-slate-400 hover:text-primary"
              }`}
            >
              {c.name}
            </button>
          </span>
        ))}
      </div>

      {/* البحث */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 right-3.5" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch();
            if (e.key === "Escape") {
              setQuery("");
              setResults(null);
            }
          }}
          placeholder="ابحث باسم الملف أو المجلد…"
          className="w-full h-11 pr-11 pl-24 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
        <div className="absolute top-1/2 -translate-y-1/2 left-2 flex items-center gap-1">
          {isSearch && (
            <button
              onClick={() => {
                setQuery("");
                setResults(null);
              }}
              className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 inline-flex items-center justify-center"
              title="إلغاء البحث"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={runSearch}
            disabled={searching || query.trim().length < 2}
            className="h-8 px-3 rounded-lg text-[12px] font-bold bg-primary text-white disabled:opacity-40 transition-opacity"
          >
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "بحث"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[13px] font-bold text-rose-600 dark:text-rose-400">{error}</p>
      )}

      {/* المحتوى */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {pending ? (
          <p className="px-4 py-10 text-center text-[13px] text-slate-400 inline-flex items-center justify-center gap-2 w-full">
            <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل…
          </p>
        ) : shown.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Folder className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="mt-3 text-[13px] font-bold text-slate-600 dark:text-slate-300">
              {isSearch ? "لا نتائج لبحثك" : "هذا المجلد فارغ"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {shown.map((node) =>
              node.kind === "FOLDER" ? (
                <li key={node.id}>
                  <button
                    onClick={() => open(node.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-right hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 inline-flex items-center justify-center shrink-0">
                      <Folder className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">
                        {node.name}
                      </span>
                      <span className="block text-[11px] text-slate-400 tabular-nums">
                        {node.childCount === 0 ? "فارغ" : `${node.childCount} عنصر`}
                        {isSearch && node.parentName && (
                          <span className="text-slate-300 dark:text-slate-600">
                            {" · في "}
                            {node.parentName}
                          </span>
                        )}
                      </span>
                    </span>
                    <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0" />
                  </button>
                </li>
              ) : (
                <li
                  key={node.id}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary dark:text-teal-400 inline-flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">
                      {node.name}
                    </span>
                    <span className="block text-[11px] text-slate-400 tabular-nums">
                      {fmtSize(node.fileSize)}
                      {isSearch && node.parentName && (
                        <span className="text-slate-300 dark:text-slate-600">
                          {node.fileSize ? " · " : ""}
                          في {node.parentName}
                        </span>
                      )}
                    </span>
                  </span>
                  {node.fileUrl && (
                    <a
                      href={node.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 h-9 px-3 rounded-xl bg-primary/10 text-primary dark:bg-teal-500/10 dark:text-teal-400 hover:bg-primary hover:text-white dark:hover:bg-teal-500 dark:hover:text-[#0A0A0A] transition-colors text-[12px] font-bold inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      تحميل
                    </a>
                  )}
                </li>
              )
            )}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
        مكتبة مشتركة يديرها فريق زاد — للاطّلاع والتحميل فقط.
      </p>
    </div>
  );
}
