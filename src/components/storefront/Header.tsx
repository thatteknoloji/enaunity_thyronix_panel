"use client"

import { ShoppingCart, Store } from "lucide-react"
import type { StoreTheme } from "@/lib/store-themes/types"

interface StorefrontHeaderProps {
  theme: StoreTheme
  storeName: string
  storeLogo: string
  cartCount: number
  onCartClick: () => void
  onNavigate?: (href: string) => void
}

export default function StorefrontHeader({
  theme, storeName, storeLogo, cartCount, onCartClick, onNavigate,
}: StorefrontHeaderProps) {
  const c = theme.colors
  const f = theme.fonts
  const l = theme.layout

  const handleNav = (href: string) => {
    if (href.startsWith("http")) {
      window.open(href, "_blank", "noopener")
    } else if (onNavigate) {
      onNavigate(href)
    }
  }

  const headerCenter = l.headerStyle === "center"
  const headerMinimal = l.headerStyle === "minimal"

  return (
    <header
      style={{ background: c.headerBg, fontFamily: f.bodyFont }}
      className={`sticky top-0 z-30 border-b border-white/10 ${headerMinimal ? "py-2" : "py-3"}`}
    >
      <div className={`max-w-5xl mx-auto px-6 flex items-center gap-4 ${headerCenter ? "flex-col" : "justify-between"}`}>
        <div className="flex items-center gap-3 shrink-0">
          {storeLogo ? (
            <img src={storeLogo} alt={storeName} className="w-9 h-9 rounded-xl object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c.primaryColor }}>
              <Store size={18} className="text-white" />
            </div>
          )}
          <span style={{ fontFamily: f.headingFont }} className="text-lg font-bold text-white truncate max-w-[200px]">
            {storeName}
          </span>
        </div>

        {!headerMinimal && theme.headerLinks.length > 0 && (
          <nav className={`flex items-center gap-1 ${headerCenter ? "mt-1" : ""}`}>
            {theme.headerLinks.map((link) => (
              <button
                key={link.label + link.href}
                onClick={() => handleNav(link.href)}
                className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                {link.label}
              </button>
            ))}
          </nav>
        )}

        <button onClick={onCartClick} className="relative p-2 text-gray-400 hover:text-white shrink-0">
          <ShoppingCart size={22} />
          {cartCount > 0 && (
            <span
              style={{ background: c.primaryColor }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center"
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
