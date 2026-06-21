export type TrustBadgeKey =
  | "visa"
  | "mastercard"
  | "troy"
  | "amex"
  | "ssl"
  | "3dsecure"
  | "pci"
  | "iyzico"
  | "paytr";

type Props = {
  badge: TrustBadgeKey;
  className?: string;
};

/** Tema uyumlu inline güven / ödeme rozetleri — harici görsel gerektirmez */
export function TrustBadgeIcon({ badge, className = "h-7 w-auto" }: Props) {
  const fill = "currentColor";
  const muted = "opacity-80";

  switch (badge) {
    case "visa":
      return (
        <svg viewBox="0 0 48 16" className={`${className} ${muted} text-ena-text`} aria-label="Visa">
          <text x="0" y="13" fontSize="14" fontWeight="800" fontFamily="system-ui, sans-serif" fill={fill}>
            VISA
          </text>
        </svg>
      );
    case "mastercard":
      return (
        <svg viewBox="0 0 36 22" className={className} aria-label="Mastercard">
          <circle cx="13" cy="11" r="9" fill="#EB001B" opacity="0.9" />
          <circle cx="23" cy="11" r="9" fill="#F79E1B" opacity="0.9" />
        </svg>
      );
    case "troy":
      return (
        <svg viewBox="0 0 52 16" className={`${className} ${muted} text-ena-text`} aria-label="Troy">
          <text x="0" y="13" fontSize="13" fontWeight="800" fontFamily="system-ui, sans-serif" fill={fill}>
            TROY
          </text>
        </svg>
      );
    case "amex":
      return (
        <svg viewBox="0 0 56 16" className={`${className} ${muted} text-sky-400`} aria-label="American Express">
          <text x="0" y="12" fontSize="11" fontWeight="700" fontFamily="system-ui, sans-serif" fill={fill}>
            AMEX
          </text>
        </svg>
      );
    case "ssl":
      return (
        <svg viewBox="0 0 72 22" className={`${className} text-ena-text`} aria-label="256 Bit SSL">
          <path
            d="M11 4a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2v-2a4 4 0 0 0-4-4Zm-2 6V8a2 2 0 1 1 4 0v2H9Z"
            className="fill-emerald-500/90"
          />
          <text x="20" y="15" fontSize="10" fontWeight="700" fill="currentColor" fontFamily="system-ui, sans-serif">
            256 Bit SSL
          </text>
        </svg>
      );
    case "3dsecure":
      return (
        <svg viewBox="0 0 80 22" className={`${className} text-ena-text`} aria-label="3D Secure">
          <rect x="0" y="2" width="18" height="18" rx="4" className="fill-violet-500/25 stroke-violet-400/60" strokeWidth="1" />
          <text x="3" y="14" fontSize="8" fontWeight="800" className="fill-violet-300" fontFamily="system-ui, sans-serif">
            3D
          </text>
          <text x="22" y="15" fontSize="10" fontWeight="700" fill="currentColor" fontFamily="system-ui, sans-serif">
            3D Secure
          </text>
        </svg>
      );
    case "pci":
      return (
        <svg viewBox="0 0 64 16" className={`${className} ${muted} text-ena-text`} aria-label="PCI DSS">
          <text x="0" y="12" fontSize="10" fontWeight="700" fontFamily="system-ui, sans-serif" fill={fill}>
            PCI DSS
          </text>
        </svg>
      );
    case "iyzico":
      return (
        <svg viewBox="0 0 52 16" className={`${className} ${muted} text-emerald-400`} aria-label="iyzico">
          <text x="0" y="12" fontSize="11" fontWeight="700" fontFamily="system-ui, sans-serif" fill={fill}>
            iyzico
          </text>
        </svg>
      );
    case "paytr":
      return (
        <svg viewBox="0 0 48 16" className={`${className} ${muted} text-sky-400`} aria-label="PayTR">
          <text x="0" y="12" fontSize="11" fontWeight="700" fontFamily="system-ui, sans-serif" fill={fill}>
            PayTR
          </text>
        </svg>
      );
    default:
      return null;
  }
}

export const TRUST_BADGE_LABELS: Record<TrustBadgeKey, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  troy: "Troy",
  amex: "American Express",
  ssl: "256 Bit SSL",
  "3dsecure": "3D Secure",
  pci: "PCI DSS",
  iyzico: "iyzico",
  paytr: "PayTR",
};
