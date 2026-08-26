"use client";

import { useCallback } from "react";
import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link2,
  Link2Off,
  Quote,
  AlignRight,
  AlignCenter,
  AlignLeft,
  RemoveFormatting,
  Undo2,
  Redo2,
} from "lucide-react";
import { GranularUndo } from "./granularUndo";

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
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed ${
        active
          ? "bg-primary/[0.12] dark:bg-primary/20 text-primary dark:text-teal-300 shadow-[inset_0_0_0_1px_rgb(15_118_110_/_0.20)]"
          : "text-slate-500 dark:text-slate-400 hover:bg-primary/[0.08] hover:text-primary dark:hover:text-teal-300"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />;
}

function EditorToolbar({ editor }: { editor: Editor }) {
  // `useEditor` stopped re-rendering on every transaction in Tiptap v3
  // (`shouldRerenderOnTransaction` defaults to false), so reading
  // `editor.isActive(...)` straight from render gives whatever was true when
  // the component last happened to render — the button highlights never
  // tracked the caret. `useEditorState` subscribes properly and re-renders
  // only when one of these selected values actually changes.
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
      isBold: editor.isActive("bold"),
      isItalic: editor.isActive("italic"),
      isUnderline: editor.isActive("underline"),
      isStrike: editor.isActive("strike"),
      isLink: editor.isActive("link"),
      isBulletList: editor.isActive("bulletList"),
      isOrderedList: editor.isActive("orderedList"),
      isBlockquote: editor.isActive("blockquote"),
      alignRight: editor.isActive({ textAlign: "right" }),
      alignCenter: editor.isActive({ textAlign: "center" }),
      alignLeft: editor.isActive({ textAlign: "left" }),
      fontSize: editor.getAttributes("textStyle").fontSize || "",
    }),
  });

  const currentFontSize = state.fontSize;
  const isLinkActive = state.isLink;

  // Link is the one control that needs a value, and a modal for it would be
  // heavier than the feature deserves. The prompt is seeded with the existing
  // href so the same button edits as well as creates.
  const handleLink = useCallback(() => {
    const previous = editor.getAttributes("link").href || "";
    const input = window.prompt("رابط الصفحة:", previous);
    if (input === null) return; // cancelled — leave the selection alone

    const href = input.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // A bare "example.com" is what people actually type. Without a scheme the
    // sanitizer's allowedSchemes check drops the mark on save, so the link
    // would silently vanish after sending.
    const withScheme = /^(https?:\/\/|mailto:)/i.test(href) ? href : `https://${href}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href: withScheme }).run();
  }, [editor]);

  return (
    <div className="min-h-12 px-2 sm:px-3 py-1.5 flex items-center gap-0.5 flex-wrap border-t border-slate-200/70 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shrink-0">
      <ToolbarButton
        title="تراجع"
        disabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="إعادة"
        disabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="w-4 h-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton title="غامق" active={state.isBold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="مائل" active={state.isItalic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="تسطير" active={state.isUnderline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <Underline className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="شطب" active={state.isStrike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="w-4 h-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton title={isLinkActive ? "تعديل الرابط" : "إدراج رابط"} active={isLinkActive} onClick={handleLink}>
        <Link2 className="w-4 h-4" />
      </ToolbarButton>
      {isLinkActive && (
        <ToolbarButton title="إزالة الرابط" onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}>
          <Link2Off className="w-4 h-4" />
        </ToolbarButton>
      )}

      <Divider />

      <ToolbarButton title="قائمة نقطية" active={state.isBulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="قائمة مرقمة" active={state.isOrderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="اقتباس" active={state.isBlockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="w-4 h-4" />
      </ToolbarButton>

      <Divider />

      {/* Right first: this is an RTL editor, so right is the default side. */}
      <ToolbarButton title="محاذاة لليمين" active={state.alignRight} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        <AlignRight className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="توسيط" active={state.alignCenter} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        <AlignCenter className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="محاذاة لليسار" active={state.alignLeft} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        <AlignLeft className="w-4 h-4" />
      </ToolbarButton>

      <Divider />

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
        className="h-8 px-2 rounded-lg bg-transparent text-[length:var(--mail-fs-meta)] font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer shrink-0 [&>option]:dark:bg-slate-800"
      >
        {FONT_SIZES.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <ToolbarButton
        title="إزالة التنسيق"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        <RemoveFormatting className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}

export default function MailRichTextEditor({ value, onChange, placeholder }: MailRichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
        link: {
          openOnClick: false, // clicking inside the editor should place the caret, not navigate
          autolink: true,
        },
      }),
      TextStyle,
      FontSize,
      TextAlign.configure({ types: ["paragraph"] }),
      GranularUndo,
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
