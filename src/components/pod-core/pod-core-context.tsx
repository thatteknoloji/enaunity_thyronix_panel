"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PodCanvasEngine } from "@/lib/pod-core/canvas-engine";
import { POD_CORE_DEFAULTS } from "@/lib/pod-core/pod-types";

type PodCoreContextValue = {
  engine: PodCanvasEngine | null;
  tick: number;
  refresh: () => void;
};

const PodCoreContext = createContext<PodCoreContextValue | null>(null);

export function PodCoreProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<PodCanvasEngine | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  if (!engineRef.current) {
    engineRef.current = new PodCanvasEngine({
      width: POD_CORE_DEFAULTS.width,
      height: POD_CORE_DEFAULTS.height,
      callbacks: { onChange: refresh, onHistoryChange: refresh, onSelectionChange: refresh },
    });
  }

  const value = useMemo(
    () => ({ engine: engineRef.current, tick, refresh }),
    [tick, refresh]
  );

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  return <PodCoreContext.Provider value={value}>{children}</PodCoreContext.Provider>;
}

export function usePodCore(): PodCoreContextValue {
  const ctx = useContext(PodCoreContext);
  if (!ctx) throw new Error("usePodCore must be used within PodCoreProvider");
  return ctx;
}
