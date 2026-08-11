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
  MoreVertical,
  Paperclip,
  Reply,
  Forward,
  Clock,
  CheckSquare,
  Square,
  RefreshCw,
  Mail as MailIcon,
  Trash
} from "lucide-react";
import { 
  getInbox, 
  getSentMails, 
  getStarredMails, 
  getTrashMails,
  markAsRead,
  toggleStar,
  moveToTrash,
  restoreFromTrash,
  deletePermanently
} from "@/app/actions/mail";
import ComposeModal from "./ComposeModal";
import Link from "next/link";

interface MailClientProps {
  session: any;
  employees: any[];
  initialTab: string;
}

export default function MailClient({ session, employees, initialTab }: MailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || initialTab;
  
  const [mails, setMails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedMails, setSelectedMails] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchMails = async () => {
    setIsLoading(true);
    setSelectedMails([]);
    try {
      let result;
      if (currentTab === "inbox") {
        result = await getInbox(page);
      } else if (currentTab === "sent") {
        result = await getSentMails(page);
      } else if (currentTab === "starred") {
        result = await getStarredMails(page);
      } else if (currentTab === "trash") {
        result = await getTrashMails(page);
      }
      
      if (result) {
        setMails(result.mails);
        setTotalPages(result.totalPages);
      }
    } catch (error) {
      console.error("Error fetching mails:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMails();
  }, [currentTab, page]);

  const handleTabChange = (tab: string) => {
    router.push(`/main/mail?tab=${tab}`);
    setPage(1);
  };

  const handleToggleStar = async (e: React.MouseEvent, mailId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      // Optimistic update
      setMails(mails.map(m => {
        if ((m.mailId && m.mailId === mailId) || m.id === mailId) {
          return { ...m, isStarred: !m.isStarred };
        }
        return m;
      }));
      await toggleStar(mailId);
      // If we are in starred tab and unstarred, refresh
      if (currentTab === "starred") {
        fetchMails();
      }
    } catch (error) {
      console.error("Error toggling star:", error);
      fetchMails(); // Revert on error
    }
  };

  const handleSelectMail = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedMails(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedMails.length === mails.length) {
      setSelectedMails([]);
    } else {
      setSelectedMails(mails.map(m => m.id));
    }
  };

  const handleBulkTrash = async () => {
    if (!selectedMails.length) return;
    if (!confirm("هل أنت متأكد من نقل الرسائل المحددة إلى سلة المهملات؟")) return;
    
    setIsLoading(true);
    for (const id of selectedMails) {
      const mailObj = mails.find(m => m.id === id);
      const mailId = mailObj?.mailId || mailObj?.id; // Handle both MailRecipient and InternalMail
      if (mailId) {
        await moveToTrash(mailId);
      }
    }
    await fetchMails();
  };

  const handleBulkRestore = async () => {
    if (!selectedMails.length) return;
    
    setIsLoading(true);
    for (const id of selectedMails) {
      const mailObj = mails.find(m => m.id === id);
      const mailId = mailObj?.mailId || mailObj?.id;
      if (mailId) {
        await restoreFromTrash(mailId);
      }
    }
    await fetchMails();
  };

  const handleBulkDelete = async () => {
    if (!selectedMails.length) return;
    if (!confirm("هل أنت متأكد من حذف الرسائل المحددة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    
    setIsLoading(true);
    for (const id of selectedMails) {
      const mailObj = mails.find(m => m.id === id);
      const mailId = mailObj?.mailId || mailObj?.id;
      if (mailId) {
        await deletePermanently(mailId);
      }
    }
    await fetchMails();
  };

  const filteredMails = mails.filter(m => {
    const mailObj = m.mail || m;
    const searchLower = searchQuery.toLowerCase();
    return mailObj.subject.toLowerCase().includes(searchLower) ||
           (mailObj.sender?.name?.toLowerCase().includes(searchLower)) ||
           mailObj.body.toLowerCase().includes(searchLower);
  });

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 border-l border-gray-100 flex flex-col">
        <div className="p-4">
          <button
            onClick={() => setIsComposeOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-xl font-medium transition-colors shadow-sm"
          >
            <PenSquare className="w-5 h-5" />
            رسالة جديدة
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <button
            onClick={() => handleTabChange("inbox")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentTab === "inbox" ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Inbox className={`w-5 h-5 ${currentTab === "inbox" ? "text-primary" : "text-gray-500"}`} />
            البريد الوارد
          </button>
          
          <button
            onClick={() => handleTabChange("sent")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentTab === "sent" ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Send className={`w-5 h-5 ${currentTab === "sent" ? "text-primary" : "text-gray-500"}`} />
            البريد المرسل
          </button>
          
          <button
            onClick={() => handleTabChange("starred")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentTab === "starred" ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Star className={`w-5 h-5 ${currentTab === "starred" ? "text-yellow-500" : "text-gray-500"}`} />
            المميزة بنجمة
          </button>
          
          <button
            onClick={() => handleTabChange("trash")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentTab === "trash" ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Trash2 className={`w-5 h-5 ${currentTab === "trash" ? "text-primary" : "text-gray-500"}`} />
            سلة المهملات
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header Toolbar */}
        <div className="relative h-16 border-b border-gray-100 flex items-center px-4 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSelectAll}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              title="تحديد الكل"
            >
              {selectedMails.length > 0 && selectedMails.length === mails.length ? (
                <CheckSquare className="w-5 h-5 text-primary" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <button 
              onClick={fetchMails}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              title="تحديث"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin text-primary" : ""}`} />
            </button>
            
            {selectedMails.length > 0 && (
              <div className="flex items-center gap-2 mr-2 pr-4 border-r border-gray-200">
                {currentTab !== "trash" && (
                  <button 
                    onClick={handleBulkTrash}
                    className="text-gray-500 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50 flex items-center gap-1 text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    نقل للمهملات
                  </button>
                )}
                {currentTab === "trash" && (
                  <>
                    <button 
                      onClick={handleBulkRestore}
                      className="text-gray-500 hover:text-green-600 transition-colors p-2 rounded-lg hover:bg-green-50 flex items-center gap-1 text-sm font-medium"
                    >
                      <RefreshCw className="w-4 h-4" />
                      استرجاع
                    </button>
                    <button 
                      onClick={handleBulkDelete}
                      className="text-gray-500 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50 flex items-center gap-1 text-sm font-medium"
                    >
                      <Trash className="w-4 h-4" />
                      حذف نهائي
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="absolute left-1/2 -translate-x-1/2 w-64 md:w-80">
            <input 
              type="text" 
              placeholder="البحث في البريد..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-full py-2 pr-10 pl-4 text-sm focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
          </div>
        </div>

        {/* Mail List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : filteredMails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                <MailIcon className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-500">لا توجد رسائل هنا</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredMails.map((item) => {
                const mail = item.mail || item; // Handle both MailRecipient and InternalMail
                const isUnread = item.isRead === false;
                const mailId = mail.id;
                
                // For inbox/trash/starred, show sender. For sent, show recipients.
                let displayName = "";
                let displayAvatar = null;
                
                if (currentTab === "sent") {
                  const recipients = mail.recipients || [];
                  if (recipients.length > 0) {
                    displayName = recipients.map((r: any) => r.employee.name).join(", ");
                    displayAvatar = recipients[0].employee.avatarUrl;
                  }
                } else {
                  displayName = mail.sender?.name;
                  displayAvatar = mail.sender?.avatarUrl;
                }

                return (
                  <div 
                    key={item.id}
                    className={`group flex items-center gap-4 px-4 py-3 hover:shadow-md cursor-pointer transition-all border-l-4 ${
                      isUnread ? "bg-primary/5 border-primary" : "bg-white border-transparent hover:border-gray-300"
                    }`}
                    onClick={() => {
                      if (!isUnread) {
                        router.push(`/main/mail/${mailId}`);
                      } else {
                        // Mark as read then navigate
                        markAsRead(mailId).then(() => {
                          router.push(`/main/mail/${mailId}`);
                        });
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 w-48 shrink-0">
                      <div onClick={(e) => handleSelectMail(e, item.id)} className="p-2 cursor-pointer text-gray-400 hover:text-primary">
                        {selectedMails.includes(item.id) ? (
                          <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </div>
                      
                      {currentTab !== "sent" && currentTab !== "trash" && (
                        <button 
                          onClick={(e) => handleToggleStar(e, mailId)}
                          className="p-1"
                        >
                          <Star className={`w-5 h-5 ${item.isStarred ? "fill-yellow-400 text-yellow-400" : "text-gray-300 group-hover:text-gray-400"}`} />
                        </button>
                      )}
                      
                      <div className="truncate font-medium text-gray-900 text-sm">
                        {displayName || "غير معروف"}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <div className={`truncate text-sm ${isUnread ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                        {mail.subject || "(بدون موضوع)"}
                      </div>
                      <span className="text-gray-400 mx-1">-</span>
                      <div className="truncate text-sm text-gray-500 font-normal">
                        {mail.body.replace(/<[^>]*>?/gm, '').substring(0, 100)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0">
                      {mail.attachments && mail.attachments.length > 0 && (
                        <Paperclip className="w-4 h-4 text-gray-400" />
                      )}
                      <div className={`text-xs whitespace-nowrap ${isUnread ? "font-bold text-primary" : "text-gray-500 font-medium"}`}>
                        {new Intl.DateTimeFormat("ar-SA", { month: "short", day: "numeric" }).format(new Date(mail.createdAt))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
            if (currentTab === "sent") {
              fetchMails();
            }
          }}
        />
      )}
    </div>
  );
}
