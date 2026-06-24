import type { StoreTheme } from "@/lib/store-themes/types"
import { STORE_THEMES } from "@/lib/store-themes/themes"

export function parseTheme(json: string): StoreTheme {
  try {
    const raw = JSON.parse(json || "{}")
    if (raw.colors && raw.fonts && raw.layout) {
      return raw as StoreTheme
    }
    const base = STORE_THEMES[0]
    return {
      ...base,
      colors: {
        ...base.colors,
        primaryColor: raw.primaryColor || base.colors.primaryColor,
        secondaryColor: raw.secondaryColor || base.colors.secondaryColor,
        backgroundColor: raw.backgroundColor || base.colors.backgroundColor,
        textColor: raw.textColor || base.colors.textColor,
        headerBg: raw.headerBg || base.colors.headerBg,
        footerBg: raw.footerBg || base.colors.footerBg,
        cardBg: raw.cardBg || base.colors.cardBg,
        buttonStyle: raw.buttonStyle || base.colors.buttonStyle,
      },
      fonts: {
        headingFont: raw.headingFont || raw.fontFamily || base.fonts.headingFont,
        bodyFont: raw.bodyFont || raw.fontFamily || base.fonts.bodyFont,
      },
    }
  } catch {
    return STORE_THEMES[0]
  }
}

export function getButtonRadius(style: "rounded" | "pill" | "sharp"): string {
  if (style === "pill") return "9999px"
  if (style === "sharp") return "0px"
  return "12px"
}
