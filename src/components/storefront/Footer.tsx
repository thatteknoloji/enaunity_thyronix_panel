"use client"

import { Instagram, Twitter, Facebook, Youtube, Music2, Linkedin, MessageCircle, Globe } from "lucide-react"
import type { StoreTheme } from "@/lib/store-themes/types"

interface StorefrontFooterProps {
  theme: StoreTheme
  storeName: string
  onNavigate?: (href: string) => void
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram size={18} />,
  twitter: <Twitter size={18} />,
  facebook: <Facebook size={18} />,
  youtube: <Youtube size={18} />,
  tiktok: <Music2 size={18} />,
  linkedin: <Linkedin size={18} />,
  pinterest: <Globe size={18} />,
  whatsapp: <MessageCircle size={18} />,
}

export default function StorefrontFooter({ theme, storeName, onNavigate }: StorefrontFooterProps) {
  const c = theme.colors
  const l = theme.layout

  if (l.footerStyle === "minimal") {
    return (
      <footer style={{ background: c.footerBg, borderColor: "rgba(255,255,255,0.1)" }} className="border-t py-6 mt-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-sm" style={{ color: c.textColor }}>
            © 2026 {storeName}
          </p>
          {theme.socialLinks.length > 0 && (
            <div className="flex items-center justify-center gap-3 mt-3">
              {theme.socialLinks.map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener"
                  className="opacity-60 hover:opacity-100 transition-opacity"
                  style={{ color: c.textColor }}
                >
                  {PLATFORM_ICONS[link.platform] || <Globe size={18} />}
                </a>
              ))}
            </div>
          )}
        </div>
      </footer>
    )
  }

  const handleClick = (href: string) => {
    if (href.startsWith("http")) {
      window.open(href, "_blank", "noopener")
    } else if (href.startsWith("/")) {
      window.location.href = href
    } else if (onNavigate) {
      onNavigate(href)
    }
  }

  return (
    <footer style={{ background: c.footerBg, borderColor: "rgba(255,255,255,0.1)" }} className="border-t mt-16">
      <div className={`max-w-5xl mx-auto px-6 py-10 ${l.footerStyle === "center" ? "text-center" : ""}`}>
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-8 ${l.footerStyle === "center" ? "justify-items-center" : ""}`}>
          <div>
            <h3
              style={{ fontFamily: theme.fonts.headingFont }}
              className="text-white font-semibold mb-3"
            >
              {storeName}
            </h3>
            <p className="text-sm" style={{ color: c.textColor }}>
              ENAUNITY
            </p>
          </div>

          {theme.footerGroups.map((group) => (
            <div key={group.title}>
              <h4
                style={{ fontFamily: theme.fonts.headingFont }}
                className="text-white font-semibold mb-3 text-sm"
              >
                {group.title}
              </h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.label + link.href}>
                    <button
                      onClick={() => handleClick(link.href)}
                      className="text-sm hover:text-white transition-colors"
                      style={{ color: c.textColor }}
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {theme.socialLinks.length > 0 && (
            <div>
              <h4
                style={{ fontFamily: theme.fonts.headingFont }}
                className="text-white font-semibold mb-3 text-sm"
              >
                Bizi Takip Et
              </h4>
              <div className="flex flex-wrap gap-3">
                {theme.socialLinks.map((link) => (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener"
                    className="opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: c.textColor }}
                    title={link.platform}
                  >
                    {PLATFORM_ICONS[link.platform] || <Globe size={18} />}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          className="mt-8 pt-6 border-t text-center"
          style={{ borderColor: "rgba(255,255,255,0.08)", color: c.textColor }}
        >
          <button onClick={() => handleClick("/siparis-takip")}
            className="text-sm underline underline-offset-2 opacity-60 hover:opacity-100 transition-opacity mb-2"
            style={{ color: c.textColor }}>
            Sipariş Takip
          </button>
          <p className="text-sm">© 2026 {storeName} — ENAUNITY</p>
        </div>
      </div>
    </footer>
  )
}
