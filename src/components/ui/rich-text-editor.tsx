"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { ImageIcon, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface RichTextEditorProps {
  content: string;
  onChange?: (html: string) => void;
  minHeight?: number;
  placeholder?: string;
  enableImages?: boolean;
}

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

async function uploadEditorImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", "content");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const r = await fetch("/api/admin/homepage/upload", { method: "POST", body: fd, signal: controller.signal });
    const d = await r.json();
    if (!r.ok || !d.success) {
      toast.error(d.error || `Yükleme başarısız (${r.status})`);
      return null;
    }
    return d.data.url as string;
  } catch (err) {
    const msg = err instanceof Error && err.name === "AbortError" ? "Yükleme zaman aşımına uğradı" : "Görsel yüklenemedi";
    toast.error(msg);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default function RichTextEditor({
  content,
  onChange,
  minHeight = 300,
  placeholder,
  enableImages = true,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const insertImageRef = useRef<(url: string, alt?: string) => void>(() => {});
  const handleImageFileRef = useRef(async (_file: File) => {});

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ...(enableImages
        ? [
            Image.configure({
              inline: false,
              allowBase64: false,
              HTMLAttributes: {
                class: "rte-image",
              },
            }),
          ]
        : []),
    ],
    content: content || "",
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px] rte-editor-body",
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
      handleDrop: (_view, event) => {
        if (!enableImages) return false;
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const image = Array.from(files).find((f) => f.type.startsWith("image/"));
        if (!image) return false;
        event.preventDefault();
        void handleImageFileRef.current(image);
        return true;
      },
      handlePaste: (_view, event) => {
        if (!enableImages) return false;
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              void handleImageFileRef.current(file);
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  handleImageFileRef.current = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Yalnızca JPG, PNG, WebP veya GIF yükleyebilirsiniz");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadEditorImage(file);
      if (url) {
        insertImageRef.current(url, file.name.replace(/\.[^.]+$/, ""));
        toast.success("Görsel eklendi");
      }
    } finally {
      setUploading(false);
    }
  };

  insertImageRef.current = (url: string, alt?: string) => {
    editor?.chain().focus().setImage({ src: url, alt: alt || "" }).run();
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50" style={{ minHeight }}>
        <p className="text-sm text-gray-400">Editör yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="rte-root">
      <div className="flex flex-wrap gap-1 mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2.5 py-1.5 text-xs rounded font-bold ${editor.isActive("bold") ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2.5 py-1.5 text-xs rounded italic ${editor.isActive("italic") ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`px-2.5 py-1.5 text-xs rounded underline ${editor.isActive("underline") ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          U
        </button>
        <span className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2.5 py-1.5 text-xs rounded ${editor.isActive("heading", { level: 1 }) ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2.5 py-1.5 text-xs rounded ${editor.isActive("heading", { level: 2 }) ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2.5 py-1.5 text-xs rounded ${editor.isActive("heading", { level: 3 }) ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          H3
        </button>
        <span className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2.5 py-1.5 text-xs rounded ${editor.isActive("bulletList") ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          • Liste
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2.5 py-1.5 text-xs rounded ${editor.isActive("orderedList") ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          1. Liste
        </button>
        <span className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`px-2.5 py-1.5 text-xs rounded ${editor.isActive({ textAlign: "left" }) ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          ⫷
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`px-2.5 py-1.5 text-xs rounded ${editor.isActive({ textAlign: "center" }) ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          ⫷⫸
        </button>
        <span className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("Link URL:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className={`px-2.5 py-1.5 text-xs rounded ${editor.isActive("link") ? "bg-gray-900 text-white" : "hover:bg-gray-200 text-gray-700"}`}
        >
          🔗
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetLink().run()}
          className="px-2.5 py-1.5 text-xs rounded hover:bg-gray-200 text-gray-700"
        >
          🔗✕
        </button>
        {enableImages ? (
          <>
            <span className="w-px bg-gray-300 mx-1" />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 text-xs rounded hover:bg-gray-200 text-gray-700 inline-flex items-center gap-1 disabled:opacity-50"
              title="Görsel yükle"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
              Görsel
            </button>
            <button
              type="button"
              onClick={() => {
                const url = window.prompt("Görsel URL (https://...):");
                if (url?.trim()) insertImageRef.current(url.trim());
              }}
              className="px-2.5 py-1.5 text-xs rounded hover:bg-gray-200 text-gray-700"
              title="URL ile görsel ekle"
            >
              URL
            </button>
          </>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImageFileRef.current(file);
          e.target.value = "";
        }}
      />

      <div
        className="rounded-lg border border-gray-200 p-4 prose prose-sm max-w-none focus-within:ring-1 focus-within:ring-gray-900 rte-editor-shell"
        style={{ minHeight }}
      >
        <EditorContent editor={editor} />
      </div>
      {enableImages ? (
        <p className="mt-1.5 text-[11px] text-gray-400">
          JPG, PNG, WebP veya GIF yükleyin — otomatik sıkıştırılır (max 30 MB kaynak, ~1920px genişlik).
        </p>
      ) : null}
    </div>
  );
}
