"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import { Bold, Italic, Underline, List, ListOrdered } from "lucide-react";

interface MailRichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const FONT_SIZES = [
  { label: "صغير", value: "12px" },
  { label: "عادي", value: "" },
  { label: "متوسط", value: "18px" },
  { label: "كبير", value: "24px" },
];

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
        active
          ? "bg-primary/[0.12] dark:bg-primary/20 text-primary dark:text-teal-300 shadow-[inset_0_0_0_1px_rgb(15_118_110_/_0.20)]"
          : "text-slate-500 dark:text-slate-400 hover:bg-primary/[0.08] hover:text-primary dark:hover:text-teal-300"
      }`}
    >
      {children}
    </button>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  const currentFontSize = editor.getAttributes("textStyle").fontSize || "";

  return (
    <div className="h-12 px-3 flex items-center gap-1 border-t border-slate-200/70 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shrink-0">
      <ToolbarButton
        title="غامق"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="مائل"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="تسطير"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="قائمة نقطية"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="قائمة مرقمة"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>

      <select
        value={currentFontSize}
        onChange={(e) => {
          const size = e.target.value;
          if (size) {
            editor.chain().focus().setFontSize(size).run();
          } else {
            editor.chain().focus().unsetFontSize().run();
          }
        }}
        title="حجم الخط"
        className="h-8 px-2 rounded-lg bg-transparent text-[length:var(--mail-fs-meta)] font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer [&>option]:dark:bg-slate-800"
      >
        {FONT_SIZES.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function MailRichTextEditor({ value, onChange, placeholder }: MailRichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, horizontalRule: false }),
      TextStyle,
      FontSize,
      Placeholder.configure({ placeholder: placeholder ?? "اكتب رسالتك هنا..." }),
    ],
    content: value,
    editorProps: {
      attributes: {
        dir: "rtl",
        class: "mail-prose mail-editor px-6 py-4 min-h-full outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  if (!editor) {
    return <div className="min-h-[240px]" />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-[240px] overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
      <EditorToolbar editor={editor} />
    </div>
  );
}
