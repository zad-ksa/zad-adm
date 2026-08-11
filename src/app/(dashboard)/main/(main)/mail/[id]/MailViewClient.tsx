"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowRight, 
  Reply, 
  Forward, 
  Trash2, 
  Paperclip, 
  Download,
  User
} from "lucide-react";
import ComposeModal from "../ComposeModal";
import { moveToTrash } from "@/app/actions/mail";
import Image from "next/image";

interface MailViewClientProps {
  session: any;
  mail: any;
  employees: any[];
}

export default function MailViewClient({ session, mail, employees }: MailViewClientProps) {
  const router = useRouter();
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [isForwardOpen, setIsForwardOpen] = useState(false);

  const handleDelete = async () => {
    if (confirm("هل أنت متأكد من نقل هذه الرسالة إلى المهملات؟")) {
      try {
        await moveToTrash(mail.id);
        router.push("/main/mail");
      } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء حذف الرسالة");
      }
    }
  };

  const toRecipients = mail.recipients.filter((r: any) => r.type === "TO");
  const ccRecipients = mail.recipients.filter((r: any) => r.type === "CC");

  const renderMailBody = (content: string) => {
    return { __html: content.replace(/\n/g, "<br />") };
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-col">
      {/* Header / Toolbar */}
      <div className="h-16 border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 shrink-0 bg-white">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-full transition-colors flex items-center gap-2"
          >
            <ArrowRight className="w-5 h-5" />
            <span className="text-sm font-medium">العودة</span>
          </button>
        </div>
      </div>

      {/* Mail Content */}
      <div className="flex-1 overflow-y-auto bg-white p-6 sm:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Subject */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {mail.subject || "(بدون موضوع)"}
          </h1>

          {/* Meta Info */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                {mail.sender?.avatarUrl ? (
                  <Image src={mail.sender.avatarUrl} alt={mail.sender.name} width={48} height={48} className="object-cover w-full h-full" />
                ) : (
                  <User className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-base">{mail.sender?.name}</div>
                <div className="text-sm text-gray-500 flex items-center gap-2 flex-wrap mt-1">
                  <span>إلى:</span>
                  <span className="text-gray-700">{toRecipients.map((r: any) => r.employee.name).join("، ")}</span>
                  
                  {ccRecipients.length > 0 && (
                    <>
                      <span className="mx-2">|</span>
                      <span>نسخة:</span>
                      <span className="text-gray-700">{ccRecipients.map((r: any) => r.employee.name).join("، ")}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg whitespace-nowrap">
              {new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(mail.createdAt))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Body */}
          <div className="prose prose-primary max-w-none prose-sm sm:prose-base text-gray-800 leading-relaxed min-h-[200px]"
               dangerouslySetInnerHTML={renderMailBody(mail.body)}
          />

          {/* Attachments */}
          {mail.attachments && mail.attachments.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                المرفقات ({mail.attachments.length})
              </h3>
              <div className="flex flex-wrap gap-3">
                {mail.attachments.map((att: any) => (
                  <a 
                    key={att.id} 
                    href={att.fileUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-primary/30 transition-colors group bg-white shadow-sm"
                  >
                    <div className="w-10 h-10 bg-primary/5 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Download className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{att.fileName}</div>
                      {att.fileSize && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {(att.fileSize / 1024 / 1024).toFixed(2)} MB
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons at the bottom */}
          <div className="mt-12 pt-6 border-t border-gray-100 flex items-center gap-4">
            <button 
              onClick={() => setIsReplyOpen(true)}
              className="px-6 py-2.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-colors flex items-center gap-2 font-bold text-sm"
            >
              <Reply className="w-4 h-4" />
              رد
            </button>
            <button 
              onClick={() => setIsForwardOpen(true)}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-2 font-bold text-sm"
            >
              <Forward className="w-4 h-4" />
              إعادة توجيه
            </button>
            <div className="flex-1"></div>
            <button 
              onClick={handleDelete}
              className="px-6 py-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-colors flex items-center gap-2 font-bold text-sm"
            >
              <Trash2 className="w-4 h-4" />
              حذف
            </button>
          </div>

        </div>
      </div>

      {isReplyOpen && (
        <ComposeModal 
          isOpen={isReplyOpen} 
          onClose={() => setIsReplyOpen(false)} 
          employees={employees}
          replyTo={mail}
          onSuccess={() => {
            setIsReplyOpen(false);
          }}
        />
      )}

      {isForwardOpen && (
        <ComposeModal 
          isOpen={isForwardOpen} 
          onClose={() => setIsForwardOpen(false)} 
          employees={employees}
          forwardMail={mail}
          onSuccess={() => {
            setIsForwardOpen(false);
          }}
        />
      )}
    </div>
  );
}
