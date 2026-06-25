import type { PodCoreHistoryEntry } from "./pod-types";

export class PodHistoryEngine {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private entries: PodCoreHistoryEntry[] = [];
  private readonly limit: number;
  private isRestoring = false;

  constructor(limit = 50) {
    this.limit = limit;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get timeline(): PodCoreHistoryEntry[] {
    return [...this.entries].reverse();
  }

  /** Snapshot kaydet — restore sırasında çağrılmaz */
  push(snapshotJson: string, label = "Düzenleme"): void {
    if (this.isRestoring) return;
    const last = this.undoStack[this.undoStack.length - 1];
    if (last === snapshotJson) return;

    this.undoStack.push(snapshotJson);
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift();
      this.entries.shift();
    }

    this.redoStack = [];
    this.entries.push({
      id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label,
      timestamp: Date.now(),
    });
  }

  undo(currentJson: string): string | null {
    if (!this.canUndo) return null;
    this.redoStack.push(currentJson);
    this.undoStack.pop();
    const prev = this.undoStack[this.undoStack.length - 1];
    if (!prev) return null;
    this.entries.pop();
    return prev;
  }

  redo(): string | null {
    if (!this.canRedo) return null;
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(next);
    this.entries.push({
      id: `h-${Date.now()}`,
      label: "Yinele",
      timestamp: Date.now(),
    });
    return next;
  }

  runRestore<T>(fn: () => Promise<T> | T): Promise<T> | T {
    this.isRestoring = true;
    try {
      return fn();
    } finally {
      this.isRestoring = false;
    }
  }

  reset(initialJson: string): void {
    this.undoStack = [initialJson];
    this.redoStack = [];
    this.entries = [{ id: "h-init", label: "Başlangıç", timestamp: Date.now() }];
  }
}
