"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { StoreTheme } from "@/lib/store-themes/types"
import { getButtonRadius } from "./theme-utils"

type BannerData = {
  id: string
  imageUrl: string
  title: string
  subtitle: string
  ctaText: string
  ctaLink: string
}

interface StorefrontBannerProps {
  theme: StoreTheme
  banners?: BannerData[]
}

export default function StorefrontBanner({ theme, banners }: StorefrontBannerProps) {
  const [current, setCurrent] = useState(0)
  const c = theme.colors
  const f = theme.fonts
  const buttonRadius = getButtonRadius(c.buttonStyle)

  const allBanners = (banners && banners.length > 0)
    ? banners
    : (theme.banner.imageUrl ? [{ id: "theme", ...theme.banner } as BannerData] : [])

  if (allBanners.length === 0) return null

  const goTo = useCallback((i: number) => setCurrent(i), [])
  const prev = useCallback(() => setCurrent((c) => (c - 1 + allBanners.length) % allBanners.length), [allBanners.length])
  const next = useCallback(() => setCurrent((c) => (c + 1) % allBanners.length), [allBanners.length])

  useEffect(() => {
    if (allBanners.length <= 1) return
    const t = setInterval(next, 5000)
    return () => clearInterval(t)
  }, [allBanners.length, next])

  const banner = allBanners[current]
  const heightMap = { small: "h-48 md:h-56", medium: "h-56 md:h-72", large: "h-64 md:h-96" }
  const heightClass = heightMap[theme.layout.bannerHeight] || heightMap.medium

  return (
    <div className={`relative ${heightClass} w-full overflow-hidden`}>
      {allBanners.map((b, i) => (
        <div
          key={b.id}
          className={`absolute inset-0 transition-opacity duration-500 ${i === current ? "opacity-100 z-10" : "opacity-0 z-0"}`}
        >
          <img src={b.imageUrl} alt={b.title || ""} className="w-full h-full object-cover" />
          {theme.layout.bannerOverlay && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          )}
          {(b.title || b.subtitle || b.ctaText) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-6 max-w-2xl">
                {b.title && (
                  <h2
                    style={{ fontFamily: f.headingFont }}
                    className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg"
                  >
                    {b.title}
                  </h2>
                )}
                {b.subtitle && (
                  <p className="text-base md:text-lg text-gray-200 mb-4 drop-shadow">
                    {b.subtitle}
                  </p>
                )}
                {b.ctaText && (
                  <a
                    href={b.ctaLink || "#"}
                    target={b.ctaLink?.startsWith("http") ? "_blank" : undefined}
                    rel={b.ctaLink?.startsWith("http") ? "noopener" : undefined}
                    style={{ background: c.primaryColor, borderRadius: buttonRadius }}
                    className="inline-block px-6 py-3 text-white font-medium hover:opacity-90 transition-all"
                  >
                    {b.ctaText}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {allBanners.length > 1 && (
        <>
          <button onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-all opacity-0 hover:opacity-100">
            <ChevronLeft size={20} />
          </button>
          <button onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-all opacity-0 hover:opacity-100">
            <ChevronRight size={20} />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {allBanners.map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-white w-4" : "bg-white/50 hover:bg-white/70"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
