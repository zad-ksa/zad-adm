"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Inbox,
  Send,
  Star,
  Trash2,
  PenSquare,
  Search,
  CheckSquare,
  Square,
  RefreshCw,
  Mail as MailIcon,
  Trash,
  ChevronRight,
  ChevronLeft,
  FileText,
} from "lucide-react";
import {
  getInbox,
  getSentMails,
  getStarredMails,
  getTrashMails,
  getDrafts,
  markAsRead,
  toggleStar,
  moveToTrash,
  restoreFromTrash,
  deletePermanently,
  deleteDraft,
} from "@/app/actions/mail";
import ComposeModal from "./ComposeModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import CircularLoader from "@/components/CircularLoader";
import MailRow from "./MailRow";
import { normalizeMailListItem, htmlToPlainText } from "./mailUtils";

interface MailClientProps {
  session: any;
  employees: any[];
  initialTab: string;
}

const FOLDERS = [
  { key: "inbox", label: "البريد الوارد", Icon: Inbox },
  { key: "sent", label: "البريد المرسل", Icon: Send },
  { key: "drafts", label: "المسودات", Icon: FileText },
  { key: "starred", label: "المميزة بنجمة", Icon: Star, accent: "secondary" as const },
  { key: "trash", label: "سلة المهملات", Icon: Trash2 },
];

type BulkAction = "trash" | "delete" | null;

export default function MailClient({ session, employees, initialTab }: MailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || initialTab;

  const [mails, setMails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedMails, setSelectedMails] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmAction, setConfirmAction] = useState<BulkAction>(null);
  const [isBulkPending, setIsBulkPending] = useState(false);
  const [editingDraft, setEditingDraft] = useState<any>(null);

  const employeesById = employees.reduce((acc: Record<string, any>, e) => {
    acc[e.id] = e;
    return acc;
  }, {});

  const fetchMails = async () => {
    setIsLoading(true);
    setSelectedMails([]);
    try {
      let result;
      if (currentTab === "inbox") {
        result = await getInbox(page);
      } else if (currentTab === "sent") {
        result = await getSentMails(page);
      } else if (currentTab === "drafts") {
        result = await getDrafts(page);
      } else if (currentTab === "starred") {
        result = await getStarredMails(page);
      } else if (currentTab === "trash") {
        result = await getTrashMails(page);
      }

      if (result) {
        setMails(result.mails);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      }
    } catch (error) {
      console.error("Error fetching mails:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, page]);

  const handleTabChange = (tab: string) => {
    router.push(`/main/mail?tab=${tab}`);
    setPage(1);
  };

  const handleOpenMail = (mailId: string, isUnread: boolean) => {
    if (isUnread) {
      markAsRead(mailId).catch((error) => console.error("Error marking mail as read:", error));
    }
  };

  const handleOpenDraft = (mailId: string) => {
    const draft = mails.find((m) => m.id === mailId);
    if (draft) setEditingDraft(draft);
  };

  const handleToggleStar = async (mailId: string) => {
    try {
      setMails((prev) =>
        prev.map((m) => {
          const rowMailId = m.mail?.id || m.id;
          if (rowMailId === mailId) {
            return { ...m, isStarred: !m.isStarred };
          }
          return m;
        })
      );
      await toggleStar(mailId);
      if (currentTab === "starred") {
        fetchMails();
      }
    } catch (error) {
      console.error("Error toggling star:", error);
      fetchMails();
    }
  };

  const handleToggleSelect = (rowId: string) => {
    setSelectedMails((prev) => (prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]));
  };

  const handleSelectAll = () => {
    if (selectedMails.length === mails.length) {
      setSelectedMails([]);
    } else {
      setSelectedMails(mails.map((m) => m.id));
    }
  };

  const resolveMailId = (rowId: string) => {
    const mailObj = mails.find((m) => m.id === rowId);
    return mailObj?.mail?.id || mailObj?.id;
  };

  const runBulkAction = async (action: (mailId: string) => Promise<any>) => {
    setIsBulkPending(true);
    try {
      for (const rowId of selectedMails) {
        const mailId = resolveMailId(rowId);
        if (mailId) await action(mailId);
      }
      await fetchMails();
    } finally {
      setIsBulkPending(false);
      setConfirmAction(null);
    }
  };

  const handleBulkRestore = () => {
    if (!selectedMails.length) return;
    runBulkAction(restoreFromTrash);
  };

  const filteredMails = mails.filter((m) => {
    const mailObj = m.mail || m;
    const searchLower = searchQuery.toLowerCase();
    return (
      mailObj.subject?.toLowerCase().includes(searchLower) ||
      mailObj.sender?.name?.toLowerCase().includes(searchLower) ||
      htmlToPlainText(mailObj.body || "").toLowerCase().includes(searchLower)
    );
  });

  const rangeStart = total === 0 ? 0 : (page - 1) * 20 + 1;
  const rangeEnd = Math.min(page * 20, total);

  return (
    <div className="mail-ui flex h-[calc(100dvh-8rem)] lg:h-[calc(100dvh-6rem)] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-[var(--mail-shadow-card)] overflow-hidden">
      {/* Folder rail */}
      <div className="w-64 border-s border-slate-200/70 dark:border-slate-800 bg-gradient-to-b from-slate-50 via-white to-teal-50/60 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 flex flex-col shrink-0">
        <div className="p-4 flex">
          <button
            onClick={() => setIsComposeOpen(true)}
            className="h-12 flex items-center justify-center gap-2 text-white bg-gradient-to-b from-[#17857c] via-primary to-[#0c645d] shadow-[var(--mail-shadow-cta)] hover:shadow-[var(--mail-shadow-cta-hover)] active:translate-y-px px-6 rounded-2xl font-bold text-[length:var(--mail-fs-nav)] transition-all"
          >
            <PenSquare className="w-4 h-4" />
            رسالة جديدة
          </button>
        </div>

        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          {FOLDERS.map(({ key, label, Icon, accent }) => {
            const isActive = currentTab === key;
            return (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`w-full h-8 flex items-center gap-3 px-3 rounded-e-full text-[length:var(--mail-fs-nav)] font-bold transition-colors ${
                  isActive
                    ? "bg-primary/10 dark:bg-primary/15 text-primary dark:text-teal-300 shadow-[inset_0_0_0_1px_rgb(15_118_110_/_0.18)]"
                    : "text-slate-600 dark:text-slate-400 hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-primary dark:hover:text-teal-300"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? (accent === "secondary" ? "text-secondary dark:text-amber-400" : "text-primary dark:text-teal-300") : ""
                  }`}
                />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-14 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between px-4 gap-4 shrink-0">
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleSelectAll}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-primary/[0.08] hover:text-primary dark:hover:text-teal-300 transition-colors"
              title="تحديد الكل"
            >
              {selectedMails.length > 0 && selectedMails.length === mails.length ? (
                <CheckSquare className="w-4 h-4 text-primary dark:text-teal-300" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={fetchMails}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-primary/[0.08] hover:text-primary dark:hover:text-teal-300 transition-colors"
              title="تحديث"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-primary dark:text-teal-300" : ""}`} />
            </button>

            {selectedMails.length > 0 && (
              <div className="flex items-center gap-1 ms-2 ps-3 border-s border-slate-200 dark:border-slate-700">
                {currentTab !== "trash" && currentTab !== "drafts" && (
                  <button
                    onClick={() => setConfirmAction("trash")}
                    className="h-8 px-3 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-500/[0.08] hover:bg-rose-500/[0.14] shadow-[var(--mail-shadow-danger)] flex items-center gap-1.5 text-[length:var(--mail-fs-meta)] font-bold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    نقل للمهملات
                  </button>
                )}
                {currentTab === "drafts" && (
                  <button
                    onClick={() => setConfirmAction("delete")}
                    className="h-8 px-3 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-500/[0.08] hover:bg-rose-500/[0.14] shadow-[var(--mail-shadow-danger)] flex items-center gap-1.5 text-[length:var(--mail-fs-meta)] font-bold transition-colors"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    حذف المسودات
                  </button>
                )}
                {currentTab === "trash" && (
                  <>
                    <button
                      onClick={handleBulkRestore}
                      className="h-8 px-3 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/60 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 flex items-center gap-1.5 text-[length:var(--mail-fs-meta)] font-bold transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      استرجاع
                    </button>
                    <button
                      onClick={() => setConfirmAction("delete")}
                      className="h-8 px-3 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-500/[0.08] hover:bg-rose-500/[0.14] shadow-[var(--mail-shadow-danger)] flex items-center gap-1.5 text-[length:var(--mail-fs-meta)] font-bold transition-colors"
                    >
                      <Trash className="w-3.5 h-3.5" />
                      حذف نهائي
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 flex justify-center px-2">
            <div className="relative w-full max-w-md">
              <input
                type="text"
                placeholder="البحث في البريد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 bg-slate-100/70 dark:bg-slate-800/60 border border-transparent rounded-full pe-10 ps-4 text-[length:var(--mail-fs-nav)] text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-primary/30 focus:shadow-[var(--mail-ring-focus)] outline-none transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute end-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {total > 0 && (
              <span className="hidden sm:inline text-[length:var(--mail-fs-meta)] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                {rangeStart}–{rangeEnd} من {total}
              </span>
            )}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-primary/[0.08] hover:text-primary dark:hover:text-teal-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-primary/[0.08] hover:text-primary dark:hover:text-teal-300 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {/* Spacer to avoid overlap with the fixed FloatingHeader pill (top-4 left-4/left-8) */}
            <div className="w-[140px] lg:w-[200px] shrink-0 pointer-events-none hidden sm:block" />
          </div>
        </div>

        {/* Mail list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <CircularLoader />
          ) : filteredMails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 gap-4">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/60 rounded-full flex items-center justify-center">
                <MailIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-[length:var(--mail-fs-subject)] font-bold text-slate-500 dark:text-slate-400">لا توجد رسائل هنا</p>
            </div>
          ) : (
            <ul role="list" className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {filteredMails.map((item) => (
                <MailRow
                  key={item.id}
                  item={normalizeMailListItem(item, currentTab, employeesById)}
                  isSelected={selectedMails.includes(item.id)}
                  showStar={currentTab !== "sent" && currentTab !== "trash" && currentTab !== "drafts"}
                  asButton={currentTab === "drafts"}
                  onToggleSelect={handleToggleSelect}
                  onToggleStar={handleToggleStar}
                  onOpen={currentTab === "drafts" ? handleOpenDraft : handleOpenMail}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {isComposeOpen && (
        <ComposeModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          employees={employees}
          onSuccess={() => {
            setIsComposeOpen(false);
            fetchMails();
          }}
        />
      )}

      {editingDraft && (
        <ComposeModal
          isOpen={!!editingDraft}
          onClose={() => {
            setEditingDraft(null);
            fetchMails();
          }}
          employees={employees}
          draft={editingDraft}
          onSuccess={() => {
            setEditingDraft(null);
            fetchMails();
          }}
        />
      )}

      <ConfirmModal
        isOpen={confirmAction !== null}
        title={confirmAction === "delete" ? (currentTab === "drafts" ? "حذف المسودات" : "حذف الرسائل نهائياً") : "نقل الرسائل إلى المهملات"}
        message={
          confirmAction === "delete"
            ? currentTab === "drafts"
              ? "هل أنت متأكد من حذف المسودات المحددة؟ لا يمكن التراجع عن هذا الإجراء."
              : "هل أنت متأكد من حذف الرسائل المحددة نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
            : "هل أنت متأكد من نقل الرسائل المحددة إلى سلة المهملات؟"
        }
        onCancel={() => setConfirmAction(null)}
        onConfirm={() =>
          runBulkAction(confirmAction === "delete" ? (currentTab === "drafts" ? deleteDraft : deletePermanently) : moveToTrash)
        }
        isPending={isBulkPending}
      />
    </div>
  );
}
