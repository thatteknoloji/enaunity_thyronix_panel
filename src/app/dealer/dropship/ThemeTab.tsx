"use client";

import { useState } from "react";
import {
  Palette, Save, RotateCcw, Plus, Trash2, GripVertical,
  Image, Type, Layout, Globe, Search, AlertCircle, CheckCircle, Loader2, ChevronDown, ChevronUp
} from "lucide-react";
import { STORE_THEMES, getThemeByName } from "@/lib/store-themes/themes";
import type { StoreTheme, StoreThemeNavLink, StoreThemeFooterGroup, StoreThemeSocialLink, StoreThemeBanner, StoreThemeSeo, StoreThemeColors, StoreThemeFonts, StoreThemeLayout } from "@/lib/store-themes/types";

type ThemeData = StoreTheme;

interface ThemeTabProps {
  store: {
    id: string;
    themeJson: string;
  } | null;
  onSaved: () => void;
}

const FONT_OPTIONS = [
  "Inter", "Poppins", "Roboto", "Playfair Display", "Lora",
  "Merriweather", "Montserrat", "Nunito", "Open Sans", "Raleway",
  "Source Sans Pro", "Work Sans", "Monaco", "DM Sans", "Manrope"
];

const COLOR_PRESETS = ["#2563eb","#7c3aed","#16a34a","#0ea5e9","#a855f7","#d97706","#ea580c","#ec4899","#18181b","#f59e0b","#38bdf8","#f97316"];

function parseThemeJson(raw: string): ThemeData {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (parsed.colors && parsed.fonts && parsed.layout) {
      return parsed as ThemeData;
    }
    const base = STORE_THEMES[0];
    const old = parsed;
    return {
      ...base,
      colors: {
        ...base.colors,
        primaryColor: old.primaryColor || base.colors.primaryColor,
        secondaryColor: old.secondaryColor || base.colors.secondaryColor,
        backgroundColor: old.backgroundColor || base.colors.backgroundColor,
        textColor: old.textColor || base.colors.textColor,
        headerBg: old.headerBg || base.colors.headerBg,
        footerBg: old.footerBg || base.colors.footerBg,
        cardBg: old.cardBg || base.colors.cardBg,
        buttonStyle: old.buttonStyle || base.colors.buttonStyle,
      },
      fonts: {
        headingFont: old.fontFamily || old.headingFont || base.fonts.headingFont,
        bodyFont: old.fontFamily || old.bodyFont || base.fonts.bodyFont,
      },
    };
  } catch {
    return STORE_THEMES[0];
  }
}

export default function ThemeTab({ store, onSaved }: ThemeTabProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeSection, setActiveSection] = useState<string>("gallery");

  const [themeData, setThemeData] = useState<ThemeData>(() => parseThemeJson(store?.themeJson || "{}"));

  const selectTheme = (theme: StoreTheme) => {
    setThemeData({ ...theme });
    setActiveSection("colors");
    setSuccess("");
  };

  const updateColors = (patch: Partial<StoreThemeColors>) => {
    setThemeData((prev) => ({ ...prev, colors: { ...prev.colors, ...patch } }));
  };

  const updateFonts = (patch: Partial<StoreThemeFonts>) => {
    setThemeData((prev) => ({ ...prev, fonts: { ...prev.fonts, ...patch } }));
  };

  const updateLayout = (patch: Partial<StoreThemeLayout>) => {
    setThemeData((prev) => ({ ...prev, layout: { ...prev.layout, ...patch } }));
  };

  const updateBanner = (patch: Partial<StoreThemeBanner>) => {
    setThemeData((prev) => ({ ...prev, banner: { ...prev.banner, ...patch } }));
  };

  const updateSeo = (patch: Partial<StoreThemeSeo>) => {
    setThemeData((prev) => ({ ...prev, seo: { ...prev.seo, ...patch } }));
  };

  const saveTheme = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/dealer/dropship/store", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeJson: JSON.stringify(themeData) }),
      });
      const d = await res.json();
      if (d.success) {
        setSuccess("Tema kaydedildi!");
        onSaved();
      } else {
        setError(d.error || "Kaydedilemedi");
      }
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { key: "gallery", label: "Hazır Temalar", icon: <Layout size={16} /> },
    { key: "colors", label: "Renkler", icon: <Palette size={16} /> },
    { key: "fonts", label: "Yazı Tipleri", icon: <Type size={16} /> },
    { key: "header", label: "Header Linkler", icon: <Globe size={16} /> },
    { key: "footer", label: "Footer", icon: <Globe size={16} /> },
    { key: "social", label: "Sosyal Linkler", icon: <Globe size={16} /> },
    { key: "banner", label: "Banner", icon: <Image size={16} /> },
    { key: "seo", label: "SEO", icon: <Search size={16} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Tema Özelleştirme</h2>
          <button
            onClick={saveTheme}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 text-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Kaydediliyor..." : "Temayı Kaydet"}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-4">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10 flex-wrap mb-6">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSection === s.key ? "bg-orange-500/20 text-orange-400" : "text-ena-light hover:text-white"
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>

        {activeSection === "gallery" && (
          <div>
            <p className="text-sm text-ena-light mb-4">Hazır temalardan birini seç, sonra diğer sekmelerden özelleştir.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {STORE_THEMES.map((theme) => {
                const isActive = themeData.name === theme.name;
                return (
                  <button
                    key={theme.name}
                    onClick={() => selectTheme(theme)}
                    className={`relative rounded-xl border overflow-hidden text-left transition-all ${
                      isActive
                        ? "border-orange-500 ring-2 ring-orange-500/30"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="h-20 flex items-end p-3" style={{ backgroundColor: theme.previewColor }}>
                      <div className="flex gap-1">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.primaryColor }} />
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.secondaryColor }} />
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.textColor }} />
                      </div>
                    </div>
                    <div className="p-3 bg-white/5">
                      <p className="text-sm font-medium text-white">{theme.label}</p>
                      <p className="text-xs text-ena-light mt-0.5 line-clamp-2">{theme.description}</p>
                    </div>
                    {isActive && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                        <CheckCircle size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeSection === "colors" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <ColorField label="Ana Renk" value={themeData.colors.primaryColor} onChange={(v) => updateColors({ primaryColor: v })} />
              <ColorField label="İkincil Renk" value={themeData.colors.secondaryColor} onChange={(v) => updateColors({ secondaryColor: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ColorField label="Arkaplan" value={themeData.colors.backgroundColor} onChange={(v) => updateColors({ backgroundColor: v })} />
              <ColorField label="Yazı Rengi" value={themeData.colors.textColor} onChange={(v) => updateColors({ textColor: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ColorField label="Header BG" value={themeData.colors.headerBg} onChange={(v) => updateColors({ headerBg: v })} />
              <ColorField label="Footer BG" value={themeData.colors.footerBg} onChange={(v) => updateColors({ footerBg: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ColorField label="Kart BG" value={themeData.colors.cardBg} onChange={(v) => updateColors({ cardBg: v })} />
              <div>
                <label className="block text-sm font-medium text-ena-light mb-1">Buton Stili</label>
                <select
                  value={themeData.colors.buttonStyle}
                  onChange={(e) => updateColors({ buttonStyle: e.target.value as "rounded" | "pill" | "sharp" })}
                  className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
                >
                  <option value="rounded">Yuvarlak</option>
                  <option value="pill">Pill</option>
                  <option value="sharp">Keskin</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeSection === "fonts" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ena-light mb-1">Başlık Fontu</label>
              <select
                value={themeData.fonts.headingFont}
                onChange={(e) => updateFonts({ headingFont: e.target.value })}
                className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
              >
                {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ena-light mb-1">Gövde Fontu</label>
              <select
                value={themeData.fonts.bodyFont}
                onChange={(e) => updateFonts({ bodyFont: e.target.value })}
                className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
              >
                {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
        )}

        {activeSection === "header" && (
          <HeaderLinksEditor
            links={themeData.headerLinks}
            onChange={(links) => setThemeData((prev) => ({ ...prev, headerLinks: links }))}
          />
        )}

        {activeSection === "footer" && (
          <FooterGroupsEditor
            groups={themeData.footerGroups}
            onChange={(groups) => setThemeData((prev) => ({ ...prev, footerGroups: groups }))}
          />
        )}

        {activeSection === "social" && (
          <SocialLinksEditor
            links={themeData.socialLinks}
            onChange={(links) => setThemeData((prev) => ({ ...prev, socialLinks: links }))}
          />
        )}

        {activeSection === "banner" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ena-light mb-1">Görsel URL</label>
              <input type="text" value={themeData.banner.imageUrl}
                onChange={(e) => updateBanner({ imageUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ena-light mb-1">Başlık</label>
                <input type="text" value={themeData.banner.title}
                  onChange={(e) => updateBanner({ title: e.target.value })}
                  className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ena-light mb-1">Alt Başlık</label>
                <input type="text" value={themeData.banner.subtitle}
                  onChange={(e) => updateBanner({ subtitle: e.target.value })}
                  className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ena-light mb-1">CTA Metni</label>
                <input type="text" value={themeData.banner.ctaText}
                  onChange={(e) => updateBanner({ ctaText: e.target.value })}
                  className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ena-light mb-1">CTA Link</label>
                <input type="text" value={themeData.banner.ctaLink}
                  onChange={(e) => updateBanner({ ctaLink: e.target.value })}
                  className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm" />
              </div>
            </div>
          </div>
        )}

        {activeSection === "seo" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ena-light mb-1">SEO Başlık</label>
              <input type="text" value={themeData.seo.title}
                onChange={(e) => updateSeo({ title: e.target.value })}
                placeholder="Mağaza adı veya açıklama"
                className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ena-light mb-1">Meta Açıklama</label>
              <textarea value={themeData.seo.description}
                onChange={(e) => updateSeo({ description: e.target.value })}
                rows={3}
                placeholder="Mağaza hakkında kısa açıklama"
                className="w-full px-3 py-2.5 bg-ena-dark border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm resize-none" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-6">
          <p className="text-xs text-ena-light">Teman önizleme: {themeData.label}</p>
          <button
            onClick={() => {
              setThemeData(parseThemeJson(store?.themeJson || "{}"));
              setSuccess("");
              setError("");
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-ena-light hover:text-white bg-white/5 rounded-lg transition-colors"
          >
            <RotateCcw size={12} /> Sıfırla
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ena-light mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent shrink-0" />
        <input type="text" value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-ena-dark border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm font-mono" />
      </div>
      <div className="flex gap-1 mt-1.5 flex-wrap">
        {COLOR_PRESETS.slice(0, 6).map((c) => (
          <button key={c} onClick={() => onChange(c)}
            className="w-5 h-5 rounded-full border border-white/10 hover:scale-110 transition-transform"
            style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  );
}

function HeaderLinksEditor({ links, onChange }: { links: StoreThemeNavLink[]; onChange: (links: StoreThemeNavLink[]) => void }) {
  const updateLink = (index: number, patch: Partial<StoreThemeNavLink>) => {
    const next = [...links];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const addLink = () => {
    onChange([...links, { label: "", href: "/", order: links.length + 1 }]);
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index).map((l, i) => ({ ...l, order: i + 1 })));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ena-light">Navigasyon linkleri (headerde görünür)</p>
        <button onClick={addLink} className="flex items-center gap-1 px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium hover:bg-orange-500/30 transition-colors">
          <Plus size={14} /> Link Ekle
        </button>
      </div>
      {links.map((link, i) => (
        <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
          <GripVertical size={14} className="text-ena-light shrink-0" />
          <input type="text" value={link.label}
            onChange={(e) => updateLink(i, { label: e.target.value })}
            placeholder="Link Adı"
            className="flex-1 px-2 py-1.5 bg-ena-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-gray-500" />
          <input type="text" value={link.href}
            onChange={(e) => updateLink(i, { href: e.target.value })}
            placeholder="/ornek"
            className="w-28 px-2 py-1.5 bg-ena-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-gray-500 font-mono" />
          <button onClick={() => removeLink(i)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function FooterGroupsEditor({ groups, onChange }: { groups: StoreThemeFooterGroup[]; onChange: (groups: StoreThemeFooterGroup[]) => void }) {
  const updateGroup = (index: number, patch: Partial<StoreThemeFooterGroup>) => {
    const next = [...groups];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const addGroup = () => {
    onChange([...groups, { title: "", links: [] }]);
  };

  const removeGroup = (index: number) => {
    onChange(groups.filter((_, i) => i !== index));
  };

  const addLinkToGroup = (groupIndex: number) => {
    const next = [...groups];
    next[groupIndex] = { ...next[groupIndex], links: [...next[groupIndex].links, { label: "", href: "/" }] };
    onChange(next);
  };

  const updateGroupLink = (groupIndex: number, linkIndex: number, patch: { label?: string; href?: string }) => {
    const next = [...groups];
    const link = { ...next[groupIndex].links[linkIndex], ...patch };
    next[groupIndex].links = [...next[groupIndex].links];
    next[groupIndex].links[linkIndex] = link;
    onChange(next);
  };

  const removeGroupLink = (groupIndex: number, linkIndex: number) => {
    const next = [...groups];
    next[groupIndex].links = next[groupIndex].links.filter((_, i) => i !== linkIndex);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ena-light">Footer grupları ve linkleri</p>
        <button onClick={addGroup} className="flex items-center gap-1 px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium hover:bg-orange-500/30 transition-colors">
          <Plus size={14} /> Grup Ekle
        </button>
      </div>
      {groups.map((group, gi) => (
        <div key={gi} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center gap-2">
            <input type="text" value={group.title}
              onChange={(e) => updateGroup(gi, { title: e.target.value })}
              placeholder="Grup Başlığı"
              className="flex-1 px-2 py-1.5 bg-ena-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-gray-500" />
            <button onClick={() => removeGroup(gi)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
          <div className="space-y-2 ml-4">
            {group.links.map((link, li) => (
              <div key={li} className="flex items-center gap-2">
                <input type="text" value={link.label}
                  onChange={(e) => updateGroupLink(gi, li, { label: e.target.value })}
                  placeholder="Link Adı"
                  className="flex-1 px-2 py-1 bg-ena-dark border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-gray-500" />
                <input type="text" value={link.href}
                  onChange={(e) => updateGroupLink(gi, li, { href: e.target.value })}
                  placeholder="/link"
                  className="w-24 px-2 py-1 bg-ena-dark border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-gray-500 font-mono" />
                <button onClick={() => removeGroupLink(gi, li)} className="p-1 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button onClick={() => addLinkToGroup(gi)} className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
              <Plus size={12} /> Link Ekle
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SocialLinksEditor({ links, onChange }: { links: StoreThemeSocialLink[]; onChange: (links: StoreThemeSocialLink[]) => void }) {
  const updateLink = (index: number, patch: Partial<StoreThemeSocialLink>) => {
    const next = [...links];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const addLink = () => {
    onChange([...links, { platform: "instagram", url: "" }]);
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  const PLATFORMS = ["instagram", "twitter", "facebook", "youtube", "tiktok", "linkedin", "pinterest", "whatsapp"];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ena-light">Sosyal medya linkleri</p>
        <button onClick={addLink} className="flex items-center gap-1 px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium hover:bg-orange-500/30 transition-colors">
          <Plus size={14} /> Link Ekle
        </button>
      </div>
      {links.map((link, i) => (
        <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
          <select value={link.platform}
            onChange={(e) => updateLink(i, { platform: e.target.value })}
            className="px-2 py-1.5 bg-ena-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50">
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="text" value={link.url}
            onChange={(e) => updateLink(i, { url: e.target.value })}
            placeholder="https://instagram.com/..."
            className="flex-1 px-2 py-1.5 bg-ena-dark border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-gray-500" />
          <button onClick={() => removeLink(i)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      {links.length === 0 && (
        <p className="text-sm text-ena-light text-center py-4">Henüz sosyal medya linki eklenmemiş.</p>
      )}
    </div>
  );
}
