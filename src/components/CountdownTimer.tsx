"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export default function CountdownTimer({ endsAt, label }: { endsAt: string; label?: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calc = () => {
      const now = new Date().getTime();
      const end = new Date(endsAt).getTime();
      const diff = end - now;

      if (diff <= 0) { setExpired(true); return; }

      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      if (d > 0) setTimeLeft(`${d}g ${h}s ${m}d ${s}sn`);
      else setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (expired) return null;

  return (
    <div className="flex items-center gap-2 text-xs bg-ena-primary/50/10 border border-ena-primary/30 text-ena-primary px-3 py-1.5 rounded-lg">
      <Clock size={13} className="animate-pulse" />
      <span className="font-mono font-bold">{timeLeft}</span>
      {label && <span className="text-ena-primary/70">{label}</span>}
    </div>
  );
}
