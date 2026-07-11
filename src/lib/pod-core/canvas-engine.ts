import {
  Canvas,
  Circle,
  FabricImage,
  FabricObject,
  Path,
  Rect,
  Textbox,
} from "fabric";
import { applyCenterGuides } from "./alignment-engine";
import {
  canvasToHistorySnapshot,
  parseHistorySnapshot,
  restoreCanvasFromDocument,
  serializeCanvas,
} from "./design-export-engine";
import { PodHistoryEngine } from "./history-engine";
import { printAreaBundleFromTemplate } from "./print-area-engine";
import { getMockupTemplate } from "./mockup-template-registry";
import {
  clearCanvasClip,
  clipToPrintableArea,
  isSystemObject,
  syncPrintOverlays,
} from "./print-area-overlay";
import { POD_CLIPART_LIBRARY, type PodClipartItem } from "./clipart-library";
import { setLayerDisplayName } from "./layer-engine";
import { ensureObjectId } from "./selection-engine";
import {
  POD_CORE_DEFAULTS,
  type MockupTemplate,
  type PodCoreDocument,
  type PodCoreTool,
  type PodCoreViewport,
  type PodOverlayVisibility,
  type PodPrintAreaBundle,
} from "./pod-types";

export type PodCanvasEngineCallbacks = {
  onChange?: () => void;
  onSelectionChange?: (ids: string[]) => void;
  onHistoryChange?: () => void;
  onPointerMove?: (coords: { x: number; y: number } | null) => void;
};

export type PodCanvasEngineOptions = {
  width?: number;
  height?: number;
  backgroundColor?: string;
  callbacks?: PodCanvasEngineCallbacks;
};

export class PodCanvasEngine {
  canvas: Canvas | null = null;
  readonly history = new PodHistoryEngine(POD_CORE_DEFAULTS.historyLimit);

  private width: number;
  private height: number;
  private backgroundColor: string;
  private callbacks: PodCanvasEngineCallbacks;
  private objectSeq = 0;
  private activeTool: PodCoreTool = "select";
  private viewport: PodCoreViewport = { zoom: 1, panX: 0, panY: 0 };
  private panActive = false;
  private panLast = { x: 0, y: 0 };
  private historyTimer: ReturnType<typeof setTimeout> | null = null;
  private mounted = false;
  private mockupTemplate: MockupTemplate | null = null;
  private printAreaBundle: PodPrintAreaBundle | null = null;
  private overlayVisibility: PodOverlayVisibility = {
    printable: true,
    safe: true,
    bleed: true,
    grid: false,
    ruler: true,
    centerGuide: true,
  };
  private snapEnabled = true;
  private spacePanActive = false;
  private wheelHandler: ((e: WheelEvent) => void) | null = null;
  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private clipEnabled = false;

  constructor(options: PodCanvasEngineOptions = {}) {
    this.width = options.width ?? POD_CORE_DEFAULTS.width;
    this.height = options.height ?? POD_CORE_DEFAULTS.height;
    this.backgroundColor = options.backgroundColor ?? POD_CORE_DEFAULTS.backgroundColor;
    this.callbacks = options.callbacks ?? {};
  }

  mount(element: HTMLCanvasElement): Canvas {
    if (this.canvas) this.dispose();
    this.canvas = new Canvas(element, {
      width: this.width,
      height: this.height,
      backgroundColor: this.backgroundColor,
      preserveObjectStacking: true,
      selection: true,
    });
    this.mounted = true;
    this.bindCanvasEvents();
    this.bindViewportKeys();
    this.applyViewport();
    if (this.mockupTemplate) {
      this.refreshPrintOverlays();
      if (this.clipEnabled) {
        clipToPrintableArea(
          this.canvas,
          this.printAreaBundle,
          this.mockupTemplate.printAreaMode ?? "RECTANGLE"
        );
      }
    }
    const snap = canvasToHistorySnapshot(this.canvas, this.viewport, this.historyTemplateId());
    this.history.reset(snap);
    this.callbacks.onHistoryChange?.();
    this.callbacks.onChange?.();
    return this.canvas;
  }

  dispose(): void {
    if (this.historyTimer) clearTimeout(this.historyTimer);
    this.unbindViewportKeys();
    this.unbindWheelZoom();
    this.canvas?.dispose();
    this.canvas = null;
    this.mounted = false;
  }

  isSnapEnabled(): boolean {
    return this.snapEnabled;
  }

  setSnapEnabled(enabled: boolean): void {
    this.snapEnabled = enabled;
    this.callbacks.onChange?.();
  }

  fitToScreen(containerWidth: number, containerHeight: number, padding = 48): void {
    if (!this.canvas || containerWidth <= 0 || containerHeight <= 0) return;
    const zoomX = (containerWidth - padding) / this.width;
    const zoomY = (containerHeight - padding) / this.height;
    const zoom = Math.max(
      POD_CORE_DEFAULTS.minZoom,
      Math.min(POD_CORE_DEFAULTS.maxZoom, Math.min(zoomX, zoomY))
    );
    this.viewport.zoom = zoom;
    this.viewport.panX = (containerWidth - this.width * zoom) / 2;
    this.viewport.panY = (containerHeight - this.height * zoom) / 2;
    this.applyViewport();
    this.callbacks.onChange?.();
  }

  bindWheelZoom(element: HTMLElement): void {
    this.unbindWheelZoom();
    this.wheelHandler = (e: WheelEvent) => {
      if (!this.canvas) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      const next = Math.max(
        POD_CORE_DEFAULTS.minZoom,
        Math.min(POD_CORE_DEFAULTS.maxZoom, this.viewport.zoom + delta)
      );
      this.viewport.zoom = next;
      this.applyViewport();
      this.callbacks.onChange?.();
    };
    element.addEventListener("wheel", this.wheelHandler, { passive: false });
  }

  unbindWheelZoom(): void {
    if (this.wheelHandler && this.canvas?.upperCanvasEl?.parentElement) {
      this.canvas.upperCanvasEl.parentElement.removeEventListener("wheel", this.wheelHandler);
    }
    this.wheelHandler = null;
  }

  bindViewportKeys(): void {
    this.unbindViewportKeys();
    this.keyDownHandler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.code === "Space" && !this.spacePanActive) {
        e.preventDefault();
        this.spacePanActive = true;
        if (this.canvas) {
          this.canvas.defaultCursor = "grab";
          this.canvas.hoverCursor = "grab";
        }
      }
    };
    this.keyUpHandler = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        this.spacePanActive = false;
        if (this.canvas && this.activeTool !== "pan") {
          this.canvas.defaultCursor = "default";
          this.canvas.hoverCursor = "move";
        }
      }
    };
    window.addEventListener("keydown", this.keyDownHandler);
    window.addEventListener("keyup", this.keyUpHandler);
  }

  unbindViewportKeys(): void {
    if (this.keyDownHandler) window.removeEventListener("keydown", this.keyDownHandler);
    if (this.keyUpHandler) window.removeEventListener("keyup", this.keyUpHandler);
    this.keyDownHandler = null;
    this.keyUpHandler = null;
  }

  pointerToCanvas(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!this.canvas) return null;
    const point = this.canvas.getScenePoint({ x: clientX, y: clientY } as PointerEvent);
    return { x: Math.round(point.x), y: Math.round(point.y) };
  }

  getViewport(): PodCoreViewport {
    return { ...this.viewport };
  }

  getPrintAreaBundle(): PodPrintAreaBundle | null {
    return this.printAreaBundle;
  }

  getMockupTemplate(): MockupTemplate | null {
    return this.mockupTemplate;
  }

  getOverlayVisibility(): PodOverlayVisibility {
    return { ...this.overlayVisibility };
  }

  setOverlayVisibility(patch: Partial<PodOverlayVisibility>): void {
    this.overlayVisibility = { ...this.overlayVisibility, ...patch };
    this.refreshPrintOverlays();
    this.callbacks.onChange?.();
  }

  setClipEnabled(enabled: boolean): void {
    this.clipEnabled = enabled;
    if (enabled) {
      clipToPrintableArea(
        this.canvas,
        this.printAreaBundle,
        this.mockupTemplate?.printAreaMode ?? "RECTANGLE"
      );
    } else {
      clearCanvasClip(this.canvas);
    }
    this.callbacks.onChange?.();
  }

  isClipEnabled(): boolean {
    return this.clipEnabled;
  }

  setMockupTemplate(template: MockupTemplate | null): void {
    this.mockupTemplate = template;
    if (template) {
      this.printAreaBundle = printAreaBundleFromTemplate(template, this.width, this.height);
    } else {
      this.printAreaBundle = null;
    }
    this.refreshPrintOverlays();
    if (this.clipEnabled && template) {
      clipToPrintableArea(
        this.canvas,
        this.printAreaBundle,
        template.printAreaMode ?? "RECTANGLE"
      );
    }
    this.callbacks.onChange?.();
  }

  refreshPrintOverlays(): void {
    syncPrintOverlays(
      this.canvas,
      this.printAreaBundle,
      this.overlayVisibility,
      this.mockupTemplate?.printAreaMode ?? "RECTANGLE"
    );
  }

  private historyTemplateId(): string | undefined {
    return this.mockupTemplate?.id;
  }

  getActiveTool(): PodCoreTool {
    return this.activeTool;
  }

  setTool(tool: PodCoreTool): void {
    this.activeTool = tool;
    if (!this.canvas) return;
    this.canvas.selection = tool === "select";
    this.canvas.defaultCursor = tool === "pan" ? "grab" : "default";
    this.canvas.hoverCursor = tool === "pan" ? "grab" : "move";
  }

  private bindCanvasEvents(): void {
    if (!this.canvas) return;
    const c = this.canvas;

    c.on("object:added", (e) => {
      const obj = e.target;
      if (obj && isSystemObject(obj)) return;
      if (obj) ensureObjectId(obj, this.nextObjectId(obj.type || "obj"));
      this.scheduleHistory("Nesne eklendi");
      this.callbacks.onChange?.();
    });

    c.on("object:removed", () => {
      this.scheduleHistory("Nesne silindi");
      this.callbacks.onChange?.();
    });

    c.on("object:modified", (e) => {
      if (e.target && this.snapEnabled) applyCenterGuides(c, e.target);
      this.scheduleHistory("Dönüştürüldü");
      this.callbacks.onChange?.();
    });

    c.on("selection:created", () => this.emitSelection());
    c.on("selection:updated", () => this.emitSelection());
    c.on("selection:cleared", () => this.emitSelection());

    c.on("mouse:down", (opt) => {
      const panTool = this.activeTool === "pan" || this.spacePanActive;
      if (!panTool) return;
      const pt = pointerClientXY(opt.e);
      if (!pt) return;
      this.panActive = true;
      this.panLast = pt;
      c.defaultCursor = "grabbing";
    });

    c.on("mouse:move", (opt) => {
      const pt = pointerClientXY(opt.e);
      if (pt) {
        const canvasPt = this.pointerToCanvas(pt.x, pt.y);
        this.callbacks.onPointerMove?.(canvasPt);
      }
      if (!this.panActive) return;
      const panTool = this.activeTool === "pan" || this.spacePanActive;
      if (!panTool) return;
      if (!pt) return;
      const dx = pt.x - this.panLast.x;
      const dy = pt.y - this.panLast.y;
      this.panLast = pt;
      this.viewport.panX += dx;
      this.viewport.panY += dy;
      this.applyViewport();
      this.callbacks.onChange?.();
    });

    c.on("mouse:up", () => {
      if (this.panActive) {
        this.panActive = false;
        if (this.activeTool === "pan" || this.spacePanActive) c.defaultCursor = "grab";
        if (!this.spacePanActive && this.activeTool !== "pan") {
          c.defaultCursor = "default";
          c.hoverCursor = "move";
        }
        this.scheduleHistory("Pan", 0);
      }
    });

    c.on("mouse:out", () => {
      this.callbacks.onPointerMove?.(null);
    });
  }

  private emitSelection(): void {
    if (!this.canvas) return;
    const active = this.canvas.getActiveObject();
    if (!active) {
      this.callbacks.onSelectionChange?.([]);
      return;
    }
    if (active.type === "activeSelection" && "getObjects" in active) {
      const objs = (active as FabricObject & { getObjects(): FabricObject[] }).getObjects();
      this.callbacks.onSelectionChange?.(objs.map((o) => String(o.get("podCoreId") || o.type)));
      return;
    }
    this.callbacks.onSelectionChange?.([String(active.get("podCoreId") || active.type || "sel")]);
  }

  private nextObjectId(prefix: string): string {
    this.objectSeq += 1;
    return `${prefix}-${this.objectSeq}`;
  }

  private scheduleHistory(label: string, delayMs = 250): void {
    if (!this.canvas || !this.mounted) return;
    if (this.historyTimer) clearTimeout(this.historyTimer);
    this.historyTimer = setTimeout(() => {
      const snap = canvasToHistorySnapshot(this.canvas, this.viewport, this.historyTemplateId());
      this.history.push(snap, label);
      this.callbacks.onHistoryChange?.();
    }, delayMs);
  }

  private applyViewport(): void {
    if (!this.canvas) return;
    const vpt = this.canvas.viewportTransform;
    if (!vpt) return;
    vpt[0] = this.viewport.zoom;
    vpt[3] = this.viewport.zoom;
    vpt[4] = this.viewport.panX;
    vpt[5] = this.viewport.panY;
    this.canvas.setViewportTransform(vpt);
    this.canvas.requestRenderAll();
  }

  setZoom(zoom: number): void {
    this.viewport.zoom = Math.max(
      POD_CORE_DEFAULTS.minZoom,
      Math.min(POD_CORE_DEFAULTS.maxZoom, zoom)
    );
    this.applyViewport();
    this.scheduleHistory("Zoom", 0);
    this.callbacks.onChange?.();
  }

  zoomIn(): void {
    this.setZoom(this.viewport.zoom + 0.1);
  }

  zoomOut(): void {
    this.setZoom(this.viewport.zoom - 0.1);
  }

  resetView(): void {
    this.viewport = { zoom: 1, panX: 0, panY: 0 };
    this.applyViewport();
    this.callbacks.onChange?.();
  }

  addRect(): void {
    if (!this.canvas) return;
    const rect = new Rect({
      left: 120,
      top: 100,
      width: 160,
      height: 100,
      fill: "#6366f1",
      rx: 8,
      ry: 8,
    });
    ensureObjectId(rect, this.nextObjectId("rect"));
    this.canvas.add(rect);
    this.canvas.setActiveObject(rect);
    this.canvas.requestRenderAll();
  }

  addCircle(): void {
    if (!this.canvas) return;
    const circle = new Circle({
      left: 200,
      top: 120,
      radius: 56,
      fill: "#0ea5e9",
    });
    ensureObjectId(circle, this.nextObjectId("circle"));
    this.canvas.add(circle);
    this.canvas.setActiveObject(circle);
    this.canvas.requestRenderAll();
  }

  addText(): void {
    if (!this.canvas) return;
    const text = new Textbox("Metin düzenle", {
      left: 140,
      top: 220,
      width: 220,
      fontSize: 28,
      fill: "#1e293b",
      fontFamily: "Inter, system-ui, sans-serif",
    });
    ensureObjectId(text, this.nextObjectId("text"));
    this.canvas.add(text);
    this.canvas.setActiveObject(text);
    this.canvas.requestRenderAll();
  }

  async addImageFromUrl(url: string): Promise<void> {
    if (!this.canvas) return;
    const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
    const maxW = this.width * 0.45;
    const scale = img.width && img.width > maxW ? maxW / img.width : 1;
    img.set({
      left: 80,
      top: 80,
      scaleX: scale,
      scaleY: scale,
    });
    ensureObjectId(img, this.nextObjectId("image"));
    this.canvas.add(img);
    this.canvas.setActiveObject(img);
    this.canvas.requestRenderAll();
  }

  async addImageFromFile(file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    try {
      await this.addImageFromUrl(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  addClipart(item: PodClipartItem): void {
    if (!this.canvas) return;
    const scale = Math.min(1, (this.width * 0.25) / Math.max(item.width, item.height));
    const path = new Path(item.path, {
      left: this.width / 2 - (item.width * scale) / 2,
      top: this.height / 2 - (item.height * scale) / 2,
      fill: item.fill,
      scaleX: scale,
      scaleY: scale,
    });
    ensureObjectId(path, this.nextObjectId("clipart"));
    setLayerDisplayName(path, item.name);
    this.canvas.add(path);
    this.canvas.setActiveObject(path);
    this.canvas.requestRenderAll();
  }

  addClipartById(id: string): void {
    const item = POD_CLIPART_LIBRARY.find((c) => c.id === id);
    if (item) this.addClipart(item);
  }

  deleteSelection(): void {
    if (!this.canvas) return;
    const active = this.canvas.getActiveObjects();
    if (!active.length) return;
    active.forEach((obj) => this.canvas!.remove(obj));
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
  }

  async undo(): Promise<void> {
    if (!this.canvas || !this.history.canUndo) return;
    const current = canvasToHistorySnapshot(this.canvas, this.viewport, this.historyTemplateId());
    const prev = this.history.undo(current);
    if (!prev) return;
    await this.history.runRestore(async () => {
      const { doc, viewport } = parseHistorySnapshot(prev);
      this.viewport = viewport;
      await restoreCanvasFromDocument(this.canvas, doc);
      this.applyViewport();
    });
    this.callbacks.onHistoryChange?.();
    this.callbacks.onChange?.();
  }

  async redo(): Promise<void> {
    if (!this.canvas || !this.history.canRedo) return;
    const next = this.history.redo();
    if (!next) return;
    await this.history.runRestore(async () => {
      const { doc, viewport } = parseHistorySnapshot(next);
      this.viewport = viewport;
      await restoreCanvasFromDocument(this.canvas, doc);
      this.applyViewport();
    });
    this.callbacks.onHistoryChange?.();
    this.callbacks.onChange?.();
  }

  serialize(): PodCoreDocument {
    return serializeCanvas(this.canvas, this.viewport, this.historyTemplateId());
  }

  async loadDocument(
    doc: PodCoreDocument,
    historyState?: import("./pod-types").PodCoreHistoryPersisted
  ): Promise<void> {
    if (!this.canvas) return;
    if (doc.templateId) {
      const tpl = getMockupTemplate(doc.templateId);
      if (tpl) this.setMockupTemplate(tpl);
    }
    await this.history.runRestore(async () => {
      this.viewport = doc.viewport ?? { zoom: 1, panX: 0, panY: 0 };
      await restoreCanvasFromDocument(this.canvas, doc);
      this.applyViewport();
      this.refreshPrintOverlays();
    });
    if (historyState) {
      this.history.importState(historyState);
    } else {
      const snap = canvasToHistorySnapshot(this.canvas, this.viewport, this.historyTemplateId());
      this.history.reset(snap);
    }
    this.callbacks.onHistoryChange?.();
    this.callbacks.onChange?.();
  }
}

function pointerClientXY(e: Event): { x: number; y: number } | null {
  if (e instanceof MouseEvent) {
    return { x: e.clientX, y: e.clientY };
  }
  const touch = (e as TouchEvent).touches?.[0] ?? (e as TouchEvent).changedTouches?.[0];
  if (touch) return { x: touch.clientX, y: touch.clientY };
  return null;
}
