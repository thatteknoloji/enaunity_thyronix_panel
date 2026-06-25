"use client";

import { History } from "lucide-react";
import { usePodCore } from "./pod-core-context";

export function PodHistoryPanel() {
  const { engine, tick } = usePodCore();
  const entries = engine?.history.timeline ?? [];

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
        <History className="h-3.5 w-3.5" /> Geçmiş
      </p>
      <ul className="max-h-40 overflow-y-auto space-y-1 text-xs" key={tick}>
        {entries.slice(0, 12).map((entry, i) => (
          <li
            key={entry.id}
            className={`rounded px-2 py-1 ${i === 0 ? "bg-emerald-500/10 text-emerald-700" : "text-ena-light/70"}`}
          >
            {entry.label}
            <span className="ml-2 text-[10px] opacity-50">
              {new Date(entry.timestamp).toLocaleTimeString("tr-TR")}
            </span>
          </li>
        ))}
        {!entries.length && <li className="text-ena-light/50 py-2">Kayıt yok</li>}
      </ul>
    </div>
  );
}
