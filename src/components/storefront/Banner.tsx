"use client"

import type { StoreTheme } from "@/lib/store-themes/types"

interface StorefrontBannerProps {
  theme: StoreTheme
}

export default function StorefrontBanner({ theme }: StorefrontBannerProps) {
  const banner = theme.banner
  if (!banner.imageUrl) return null

  const heightMap = { small: "h-48 md:h-56", medium: "h-56 md:h-72", large: "h-64 md:h-96" }
  const heightClass = heightMap[theme.layout.bannerHeight] || heightMap.medium

  return (
    <div className={`relative ${heightClass} w-full overflow-hidden`}>
      <img
        src={banner.imageUrl}
        alt={banner.title || ""}
        className="w-full h-full object-cover"
      />
      {theme.layout.bannerOverlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      )}
      {(banner.title || banner.subtitle || banner.ctaText) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-6 max-w-2xl">
            {banner.title && (
              <h2
                style={{ fontFamily: theme.fonts.headingFont }}
                className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg"
              >
                {banner.title}
              </h2>
            )}
            {banner.subtitle && (
              <p className="text-base md:text-lg text-gray-200 mb-4 drop-shadow">
                {banner.subtitle}
              </p>
            )}
            {banner.ctaText && (
              <a
                href={banner.ctaLink || "#"}
                target={banner.ctaLink?.startsWith("http") ? "_blank" : undefined}
                rel={banner.ctaLink?.startsWith("http") ? "noopener" : undefined}
                style={{
                  background: theme.colors.primaryColor,
                  borderRadius: theme.colors.buttonStyle === "pill" ? "9999px" : theme.colors.buttonStyle === "sharp" ? "0" : "12px",
                }}
                className="inline-block px-6 py-3 text-white font-medium hover:opacity-90 transition-all"
              >
                {banner.ctaText}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
