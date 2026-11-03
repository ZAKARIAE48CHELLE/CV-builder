"use client";

import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Bold, Italic, List, Link as LinkIcon, RemoveFormatting } from "lucide-react";
import { sanitizeRichHtml } from "@/lib/security/sanitize";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Describe accomplishments with quantifiable impact (e.g. • Led team of 5 to increase revenue by 25%)...",
  minHeight = "90px",
}) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        strike: false,
        horizontalRule: false,
        code: false,
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline",
        },
      }),
    ],
    content: sanitizeRichHtml(value || ""),
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none p-3 text-sm text-neutral-800 dark:text-neutral-200 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1`,
        style: `min-height: ${minHeight};`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(sanitizeRichHtml(ed.getHTML()));
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 animate-pulse"
        style={{ minHeight }}
      />
    );
  }

  const charCount = editor.getText().length;

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter link URL:", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-neutral-900 dark:focus-within:ring-neutral-300 focus-within:border-transparent transition-all">
      {/* Mini toolbar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/60 text-neutral-600 dark:text-neutral-400">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded text-xs transition-colors ${
              editor.isActive("bold")
                ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-bold"
                : "hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60"
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded text-xs transition-colors ${
              editor.isActive("italic")
                ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 italic"
                : "hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60"
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded text-xs transition-colors ${
              editor.isActive("bulletList")
                ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                : "hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60"
            }`}
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={setLink}
            className={`p-1.5 rounded text-xs transition-colors ${
              editor.isActive("link")
                ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                : "hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60"
            }`}
            title="Add Link"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            className="p-1.5 rounded text-xs hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors"
            title="Clear formatting"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Character count */}
        <div className="text-[11px] font-mono text-neutral-400">
          {charCount} chars
        </div>
      </div>

      {/* Editor surface */}
      <EditorContent editor={editor} />
    </div>
  );
};
