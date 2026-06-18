"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";

interface RichTextEditorProps {
  content: string;
  onChange?: (html: string) => void;
  minHeight?: number;
  placeholder?: string;
}

export default function RichTextEditor({ content, onChange, minHeight = 300, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: content || "",
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px]",
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
  });

  if (!editor) {
    return (
      <div className="flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50" style={{ minHeight }}>
        <p className="text-sm text-gray-400">Editör yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2.5 py-1.5 text-xs rounded font-bold ${editor.isActive("bold") ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2.5 py-1.5 text-xs rounded italic ${editor.isActive("italic") ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`px-2.5 py-1.5 text-xs rounded underline ${editor.isActive("underline") ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          U
        </button>
        <span className="w-px bg-gray-300 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2.5 py-1.5 text-xs rounded ${editor.isActive("heading", { level: 1 }) ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2.5 py-1.5 text-xs rounded ${editor.isActive("heading", { level: 2 }) ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2.5 py-1.5 text-xs rounded ${editor.isActive("heading", { level: 3 }) ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          H3
        </button>
        <span className="w-px bg-gray-300 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2.5 py-1.5 text-xs rounded ${editor.isActive("bulletList") ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          • Liste
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2.5 py-1.5 text-xs rounded ${editor.isActive("orderedList") ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          1. Liste
        </button>
        <span className="w-px bg-gray-300 mx-1" />
        <button
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`px-2.5 py-1.5 text-xs rounded ${editor.isActive({ textAlign: "left" }) ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          ⫷
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`px-2.5 py-1.5 text-xs rounded ${editor.isActive({ textAlign: "center" }) ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          ⫷⫸
        </button>
        <span className="w-px bg-gray-300 mx-1" />
        <button
          onClick={() => {
            const url = window.prompt("Link URL:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className={`px-2.5 py-1.5 text-xs rounded ${editor.isActive("link") ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          🔗
        </button>
        <button
          onClick={() => editor.chain().focus().unsetLink().run()}
          className="px-2.5 py-1.5 text-xs rounded hover:bg-gray-200 text-gray-700"
        >
          🔗✕
        </button>
      </div>

      <div
        className="rounded-lg border border-gray-200 p-4 prose prose-sm max-w-none focus-within:ring-1 focus-within:ring-gray-900"
        style={{ minHeight }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
