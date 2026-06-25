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
import { getDefaultMockupTemplate } from "@/lib/pod-core/mockup-template-registry";
import { POD_CORE_DEFAULTS, type MockupTemplate } from "@/lib/pod-core/pod-types";

type PodCoreContextValue = {
  engine: PodCanvasEngine | null;
  tick: number;
  refresh: () => void;
  mockupTemplate: MockupTemplate;
  setMockupTemplate: (t: MockupTemplate) => void;
  selectedObjectIds: string[];
};

const PodCoreContext = createContext<PodCoreContextValue | null>(null);

export function PodCoreProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<PodCanvasEngine | null>(null);
  const [tick, setTick] = useState(0);
  const [mockupTemplate, setMockupTemplateState] = useState<MockupTemplate>(getDefaultMockupTemplate());
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  if (!engineRef.current) {
    engineRef.current = new PodCanvasEngine({
      width: POD_CORE_DEFAULTS.width,
      height: POD_CORE_DEFAULTS.height,
      callbacks: {
        onChange: refresh,
        onHistoryChange: refresh,
        onSelectionChange: (ids) => {
          setSelectedObjectIds(ids);
          refresh();
        },
      },
    });
    engineRef.current.setMockupTemplate(getDefaultMockupTemplate());
  }

  const setMockupTemplate = useCallback(
    (t: MockupTemplate) => {
      setMockupTemplateState(t);
      engineRef.current?.setMockupTemplate(t);
      refresh();
    },
    [refresh]
  );

  const value = useMemo(
    () => ({
      engine: engineRef.current,
      tick,
      refresh,
      mockupTemplate,
      setMockupTemplate,
      selectedObjectIds,
    }),
    [tick, refresh, mockupTemplate, setMockupTemplate, selectedObjectIds]
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
