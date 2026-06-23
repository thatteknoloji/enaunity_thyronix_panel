"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface SmartSearchProps {
  variant?: "hero" | "header";
  onClose?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
}

export default function SmartSearch({
  variant = "hero",
  onClose,
  autoFocus,
  placeholder,
}: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const router = useRouter();

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(q)}`);
      const d = await res.json();
      setResults(d.data || []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (id: string) => {
    setOpen(false);
    setQuery("");
    onClose?.();
    router.push(`/products/${id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
    if (e.key === "Enter" && results.length > 0) handleSelect(results[0].id);
  };

  const isHero = variant === "hero";

  return (
    <div ref={containerRef} className={`relative ${isHero ? "w-full" : ""}`}>
      <div
        className={`flex items-center gap-2 rounded-xl transition-all duration-300 ${
          isHero
            ? "bg-white/10 backdrop-blur-md border border-white/20 focus-within:border-ena-primary/60 focus-within:bg-white/15 px-4 py-3"
            : "bg-ena-card/70 border border-ena-border focus-within:border-ena-primary/50 px-3 py-2"
        }`}
      >
        {loading ? (
          <Loader2 size={isHero ? 20 : 16} className="text-ena-light animate-spin shrink-0" />
        ) : (
          <Search size={isHero ? 20 : 16} className="text-ena-light shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length || loading) setOpen(true); }}
          placeholder={placeholder || (isHero ? "Ürün, kategori veya marka ara..." : "Ara...")}
          className={`w-full bg-transparent text-ena-text placeholder:text-ena-text-muted/50 focus:outline-none ${
            isHero ? "text-base" : "text-sm"
          }`}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); inputRef.current?.focus(); }}
            className="text-ena-light hover:text-ena-text transition-colors"
          >
            <svg width={isHero ? 18 : 14} height={isHero ? 18 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div
          className={`absolute left-0 right-0 z-50 mt-2 rounded-xl border bg-ena-dark border-ena-border shadow-2xl overflow-hidden ${
            isHero ? "backdrop-blur-xl" : ""
          }`}
        >
          {results.length === 0 && !loading && query.trim() && (
            <div className="px-4 py-8 text-center text-sm text-ena-light">
              <Search size={24} className="mx-auto mb-2 opacity-30" />
              &ldquo;{query}&rdquo; için sonuç bulunamadı
            </div>
          )}

          {results.length > 0 && (
            <div className="max-h-80 overflow-y-auto divide-y divide-ena-border">
              {results.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelect(product.id)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-ena-card/60 transition-colors"
                >
                  <div className="h-12 w-12 rounded-lg overflow-hidden bg-ena-gray shrink-0">
                    <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ena-text truncate">{product.name}</p>
                    <p className="text-xs text-ena-light truncate">{product.category}{product.subcategory ? ` / ${product.subcategory}` : ""}</p>
                  </div>
                  <div className="text-sm font-bold text-ena-primary shrink-0">{formatPrice(product.price)}</div>
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-ena-light">
              <Loader2 size={14} className="animate-spin" />
              Aranıyor...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
