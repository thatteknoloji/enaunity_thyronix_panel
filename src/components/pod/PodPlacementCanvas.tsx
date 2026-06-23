"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PodOverlayArea, PodPlacement } from "@/lib/pod/types";
import { computeDesignDrawRect } from "@/lib/pod/pod-design-engine";

type Props = {
  templateImageUrl: string;
  designImageUrl: string;
  designWidth: number;
  designHeight: number;
  overlay: PodOverlayArea;
  placement: PodPlacement;
  onPlacementChange: (p: PodPlacement) => void;
  canvasWidth?: number;
};

export function PodPlacementCanvas({
  templateImageUrl,
  designImageUrl,
  designWidth,
  designHeight,
  overlay,
  placement,
  onPlacementChange,
  canvasWidth = 480,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const templateImg = useRef<HTMLImageElement | null>(null);
  const designImg = useRef<HTMLImageElement | null>(null);
  const scaleRef = useRef(1);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const tpl = templateImg.current;
    const des = designImg.current;
    if (!canvas || !tpl?.complete || !des?.complete) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = canvasWidth / tpl.naturalWidth;
    scaleRef.current = scale;
    const h = tpl.naturalHeight * scale;
    canvas.width = canvasWidth;
    canvas.height = h;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tpl, 0, 0, canvas.width, canvas.height);

    const rect = computeDesignDrawRect(placement, designWidth, designHeight, overlay);
    const sx = rect.left * scale;
    const sy = rect.top * scale;
    const sw = rect.width * scale;
    const sh = rect.height * scale;

    ctx.save();
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(overlay.x * scale, overlay.y * scale, overlay.width * scale, overlay.height * scale);
    ctx.setLineDash([]);

    ctx.translate(sx + sw / 2, sy + sh / 2);
    ctx.rotate((placement.rotation * Math.PI) / 180);
    ctx.drawImage(des, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();
  }, [canvasWidth, designHeight, designWidth, overlay, placement]);

  useEffect(() => {
    const tpl = new Image();
    tpl.crossOrigin = "anonymous";
    tpl.src = templateImageUrl;
    tpl.onload = () => {
      templateImg.current = tpl;
      draw();
    };
    const des = new Image();
    des.crossOrigin = "anonymous";
    des.src = designImageUrl;
    des.onload = () => {
      designImg.current = des;
      draw();
    };
  }, [templateImageUrl, designImageUrl, draw]);

  useEffect(() => {
    draw();
  }, [placement, draw]);

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: placement.x, py: placement.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = (e.clientX - dragStart.current.x) / scaleRef.current;
    const dy = (e.clientY - dragStart.current.y) / scaleRef.current;
    onPlacementChange({
      ...placement,
      x: dragStart.current.px + dx,
      y: dragStart.current.py + dy,
    });
  };

  const onPointerUp = () => setDragging(false);

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        className="rounded-xl border border-ena-border bg-black/20 cursor-move touch-none max-w-full"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
      <div className="grid grid-cols-3 gap-3 text-xs">
        <label className="space-y-1">
          <span className="text-ena-light/70">Ölçek</span>
          <input
            type="range"
            min={0.2}
            max={2}
            step={0.05}
            value={placement.scale}
            onChange={(e) => onPlacementChange({ ...placement, scale: Number(e.target.value) })}
            className="w-full"
          />
        </label>
        <label className="space-y-1">
          <span className="text-ena-light/70">Döndür</span>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={placement.rotation}
            onChange={(e) => onPlacementChange({ ...placement, rotation: Number(e.target.value) })}
            className="w-full"
          />
        </label>
        <div className="text-ena-light/50 self-end">
          x:{Math.round(placement.x)} y:{Math.round(placement.y)}
        </div>
      </div>
    </div>
  );
}
