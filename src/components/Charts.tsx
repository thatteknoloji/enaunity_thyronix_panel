"use client";

import { useEffect, useRef } from "react";

interface BarChartProps {
  data: number[];
  labels: string[];
  height?: number;
  color?: string;
}

export function BarChart({ data, labels, height = 160, color = "#7c3aed" }: BarChartProps) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end justify-between gap-1.5" style={{ height }}>
      {data.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
          <span className="text-[10px] font-medium text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
            {val.toLocaleString("tr-TR")}₺
          </span>
          <div
            className="w-full rounded-t transition-all duration-500 hover:opacity-80 cursor-pointer"
            style={{
              height: `${Math.max((val / max) * 100, val > 0 ? 4 : 0)}%`,
              background: `linear-gradient(to top, ${color}, ${color}cc)`,
              minHeight: val > 0 ? "4px" : "0px",
            }}
          />
          <span className="text-[10px] text-gray-400">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

interface DonutChartProps {
  data: Record<string, number>;
  colors?: Record<string, string>;
}

const DEFAULT_COLORS = ["#7c3aed", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export function DonutChart({ data, colors = {} }: DonutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  useEffect(() => {
    if (!canvasRef.current || entries.length === 0) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 160;
    canvasRef.current.width = size * dpr;
    canvasRef.current.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 16;
    const lineWidth = 28;

    ctx.clearRect(0, 0, size, size);

    let startAngle = -Math.PI / 2;
    entries.forEach(([, val], i) => {
      const sliceAngle = (val / total) * Math.PI * 2;
      const color = colors[entries[i][0]] || DEFAULT_COLORS[i % DEFAULT_COLORS.length];

      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.stroke();

      startAngle += sliceAngle;
    });

    ctx.beginPath();
    ctx.arc(cx, cy, r - lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }, [data, colors]);

  if (entries.length === 0) return <div className="text-center text-gray-400 py-8 text-sm">Veri yok</div>;

  return (
    <div className="flex items-center gap-4">
      <canvas ref={canvasRef} style={{ width: 160, height: 160 }} />
      <div className="space-y-1.5 flex-1 min-w-0">
        {entries.map(([key, val], i) => {
          const pct = ((val / total) * 100).toFixed(0);
          const color = colors[key] || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          return (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-gray-600 truncate">{key}</span>
              <span className="font-medium text-gray-900 ml-auto">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
