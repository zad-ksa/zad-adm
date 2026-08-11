"use client";

import { useState, useRef } from "react";
import { X, Paperclip, Send, Loader2 } from "lucide-react";
import { sendMail } from "@/app/actions/mail";
import { useRoleLabels } from "@/components/RoleLabelsProvider";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: any[];
  onSuccess: () => void;
  replyTo?: any; // Mail object if it's a reply
  forwardMail?: any; // Mail object if it's a forward
}

export default function ComposeModal({ isOpen, onClose, employees, onSuccess, replyTo, forwardMail }: ComposeModalProps) {
  const roleLabels = useRoleLabels();
  const [toIds, setToIds] = useState<string[]>(replyTo ? [replyTo.senderId] : []);
  const [ccIds, setCcIds] = useState<string[]>([]);
  const [bccIds, setBccIds] = useState<string[]>([]);
  
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  
  const initialSubject = replyTo 
    ? `رد: ${replyTo.subject}` 
    : forwardMail 
      ? `إعادة توجيه: ${forwardMail.subject}` 
      : "";
      
  const initialBody = replyTo 
    ? `\n\n\n--- الرسالة الأصلية ---\nمن: ${replyTo.sender?.name}\nالتاريخ: ${new Date(replyTo.createdAt).toLocaleString('ar-SA')}\nالموضوع: ${replyTo.subject}\n\n${replyTo.body}`
    : forwardMail
      ? `\n\n\n--- رسالة معاد توجيهها ---\nمن: ${forwardMail.sender?.name}\nالتاريخ: ${new Date(forwardMail.createdAt).toLocaleString('ar-SA')}\nالموضوع: ${forwardMail.subject}\n\n${forwardMail.body}`
      : "";

  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const uploadFiles = async (files: File[]) => {
    const uploadedAttachments: { fileUrl: string; fileName: string; fileSize: number }[] = [];
    
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        uploadedAttachments.push({
          fileUrl: data.url,
          fileName: file.name,
          fileSize: file.size,
        });
      }
    }
    
    // Also include forward attachments if forwarding
    if (forwardMail && forwardMail.attachments) {
      for (const att of forwardMail.attachments) {
        uploadedAttachments.push({
          fileUrl: att.fileUrl,
          fileName: att.fileName,
          fileSize: att.fileSize,
        });
      }
    }
    
    return uploadedAttachments;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (toIds.length === 0) {
      alert("يجب تحديد مستلم واحد على الأقل");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const uploadedAttachments = await uploadFiles(attachments);
      
      await sendMail({
        subject: subject || "(بدون موضوع)",
        body,
        toIds,
        ccIds,
        bccIds,
        attachments: uploadedAttachments,
        parentId: replyTo?.id || undefined,
      });
      
      onSuccess();
    } catch (error) {
      console.error("Error sending mail:", error);
      alert("حدث خطأ أثناء إرسال الرسالة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Helper for rendering employee multi-select
  const renderEmployeeSelect = (selectedIds: string[], setIds: (ids: string[]) => void, placeholder: string) => (
    <div className="flex flex-wrap gap-2 items-center w-full">
      {selectedIds.map(id => {
        const emp = employees.find(e => e.id === id);
        return emp ? (
          <div key={id} className="bg-primary/5 text-primary px-2 py-1 rounded-md flex items-center gap-1 text-sm">
            {emp.name}
            <button type="button" onClick={() => setIds(selectedIds.filter(i => i !== id))} className="text-primary/60 hover:text-primary">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : null;
      })}
      <select 
        className="flex-1 bg-transparent border-none focus:ring-0 text-sm min-w-[150px] text-gray-700"
        value=""
        onChange={(e) => {
          if (e.target.value && !selectedIds.includes(e.target.value)) {
            setIds([...selectedIds, e.target.value]);
          }
        }}
      >
        <option value="" disabled>{selectedIds.length === 0 ? placeholder : "إضافة موظف..."}</option>
        {employees.filter(e => !selectedIds.includes(e.id)).map(e => (
          <option key={e.id} value={e.id}>{e.name} - {roleLabels[e.role] || e.role}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">رسالة جديدة</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-0 divide-y divide-gray-100">
            
            {/* TO field */}
            <div className="py-2 flex items-start gap-4">
              <div className="w-16 pt-2 text-sm font-medium text-gray-500">إلى</div>
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between min-h-[40px]">
                  {renderEmployeeSelect(toIds, setToIds, "المستلمون...")}
                  
                  <div className="flex gap-2 mr-2">
                    {!showCc && (
                      <button type="button" onClick={() => setShowCc(true)} className="text-xs font-medium text-gray-500 hover:text-primary px-2">نسخة (Cc)</button>
                    )}
                    {!showBcc && (
                      <button type="button" onClick={() => setShowBcc(true)} className="text-xs font-medium text-gray-500 hover:text-primary px-2">نسخة مخفية (Bcc)</button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* CC field */}
            {showCc && (
              <div className="py-2 flex items-start gap-4">
                <div className="w-16 pt-2 text-sm font-medium text-gray-500">نسخة</div>
                <div className="flex-1 flex items-center min-h-[40px]">
                  {renderEmployeeSelect(ccIds, setCcIds, "نسخة إلى...")}
                </div>
              </div>
            )}

            {/* BCC field */}
            {showBcc && (
              <div className="py-2 flex items-start gap-4">
                <div className="w-16 pt-2 text-sm font-medium text-gray-500">نسخة مخفية</div>
                <div className="flex-1 flex items-center min-h-[40px]">
                  {renderEmployeeSelect(bccIds, setBccIds, "نسخة مخفية إلى...")}
                </div>
              </div>
            )}

            {/* Subject field */}
            <div className="py-2 flex items-center gap-4">
              <div className="w-16 text-sm font-medium text-gray-500">الموضوع</div>
              <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="موضوع الرسالة"
                className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 py-2 placeholder:text-gray-300"
              />
            </div>
          </div>

          {/* Body field */}
          <div className="px-6 py-2 h-64 flex flex-col">
            <textarea 
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="flex-1 w-full bg-transparent border-none focus:ring-0 text-gray-900 resize-none placeholder:text-gray-300"
              placeholder="اكتب رسالتك هنا..."
            />
          </div>
          
          {/* Attachments List */}
          {(attachments.length > 0 || (forwardMail && forwardMail.attachments?.length > 0)) && (
            <div className="px-6 py-3 bg-gray-50 flex flex-wrap gap-2">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-sm">
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button type="button" onClick={() => removeAttachment(i)} className="text-gray-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {forwardMail?.attachments?.map((att: any, i: number) => (
                <div key={`fwd-${i}`} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-sm">
                  <span className="truncate max-w-[150px]">{att.fileName}</span>
                  <span className="text-xs text-gray-400">(مرفق مُعاد توجيهه)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
              title="إرفاق ملف"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              multiple 
            />
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || toIds.length === 0}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            إرسال
          </button>
        </div>
      </div>
    </div>
  );
}
