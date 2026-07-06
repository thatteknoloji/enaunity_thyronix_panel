"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type NavNode = {
  id: string;
  name: string;
  slug: string;
  children: NavNode[];
};

type Props = {
  onNavigate: () => void;
};

function XmlNavBranch({
  node,
  depth,
  onNavigate,
}: {
  node: NavNode;
  depth: number;
  onNavigate: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const hasChildren = node.children.length > 0;
  const pad = depth > 0 ? { marginLeft: `${Math.min(depth, 4) * 12}px` } : undefined;

  if (!hasChildren) {
    return (
      <Link
        href={`/categories/${node.slug}`}
        onClick={onNavigate}
        style={pad}
        className="block px-3 py-2 rounded-lg text-sm text-ena-light/70 hover:text-ena-text hover:bg-ena-card/50 transition-colors"
      >
        {node.name}
      </Link>
    );
  }

  return (
    <div style={pad}>
      <button
        type="button"
        onClick={() => {
          if (depth === 0) {
            setOpen(!open);
            return;
          }
          setOpen(!open);
        }}
        className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm text-ena-light hover:text-ena-text hover:bg-ena-card transition-colors"
      >
        <span className={depth === 0 ? "font-medium" : ""}>{node.name}</span>
        <svg
          className={`w-4 h-4 transition-transform shrink-0 ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && (
        <div className="ml-2 pl-2 border-l border-ena-border space-y-0.5 mt-0.5 mb-1">
          <button
            type="button"
            onClick={() => {
              onNavigate();
              router.push(`/categories/${node.slug}`);
            }}
            className="block w-full text-left px-3 py-1.5 rounded-lg text-xs text-ena-primary hover:bg-ena-card/50 transition-colors"
          >
            Tümünü gör
          </button>
          {node.children.map((child) => (
            <XmlNavBranch key={child.id} node={child} depth={depth + 1} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

export function XmlCategoryNav({ onNavigate }: Props) {
  const [tree, setTree] = useState<NavNode | null>(null);
  const [xmlOpen, setXmlOpen] = useState(false);

  useEffect(() => {
    fetch("/api/categories/xml-nav")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.children?.length) setTree(d.data);
      })
      .catch(() => setTree(null));
  }, []);

  if (!tree?.children?.length) return null;

  return (
    <>
      <div className="h-px bg-ena-border my-2" />
      <button
        type="button"
        onClick={() => setXmlOpen(!xmlOpen)}
        className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-semibold text-ena-text hover:bg-ena-card transition-colors"
      >
        {tree.name}
        <svg
          className={`w-4 h-4 transition-transform ${xmlOpen ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {xmlOpen && (
        <div className="ml-2 pl-2 border-l border-ena-border space-y-0.5 mt-0.5 mb-1">
          <Link
            href={`/categories/${tree.slug}`}
            onClick={onNavigate}
            className="block px-3 py-1.5 rounded-lg text-xs text-ena-primary hover:bg-ena-card/50 transition-colors"
          >
            Tüm XML ürünleri
          </Link>
          {tree.children.map((child) => (
            <XmlNavBranch key={child.id} node={child} depth={0} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </>
  );
}
