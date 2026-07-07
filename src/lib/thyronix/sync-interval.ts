/** Thyronix kaynak senkron aralığı preset'leri (dakika). */
export const THYRONIX_SYNC_INTERVAL_PRESETS = [
  { minutes: 0, label: "Manuel (kapalı)" },
  { minutes: 240, label: "4 saat" },
  { minutes: 360, label: "6 saat" },
  { minutes: 720, label: "12 saat" },
  { minutes: 1440, label: "24 saat" },
] as const;

export const DEFAULT_THYRONIX_SYNC_INTERVAL = 360;

export function formatThyronixSyncInterval(minutes: number): string {
  const preset = THYRONIX_SYNC_INTERVAL_PRESETS.find((p) => p.minutes === minutes);
  if (preset) return preset.label;
  if (minutes <= 0) return "Manuel (kapalı)";
  if (minutes % 1440 === 0) return `${minutes / 1440} gün`;
  if (minutes % 60 === 0) return `${minutes / 60} saat`;
  return `${minutes} dk`;
}

export function isKnownThyronixSyncInterval(minutes: number): boolean {
  return THYRONIX_SYNC_INTERVAL_PRESETS.some((p) => p.minutes === minutes);
}
