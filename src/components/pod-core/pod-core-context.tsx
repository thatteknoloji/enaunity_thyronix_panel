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
import type { PricingCustomerType } from "@/lib/pricing-engine/pricing-types";
import { PodCanvasEngine } from "@/lib/pod-core/canvas-engine";
import { getDefaultMockupTemplate } from "@/lib/pod-core/mockup-template-registry";
import {
  buildPricingBridgePayload,
  fetchPodPricing,
} from "@/lib/pod-core/pod-pricing-bridge";
import {
  POD_CORE_DEFAULTS,
  type MockupTemplate,
  type PodPricingSnapshot,
} from "@/lib/pod-core/pod-types";

type PodCoreContextValue = {
  engine: PodCanvasEngine | null;
  tick: number;
  refresh: () => void;
  mockupTemplate: MockupTemplate;
  setMockupTemplate: (t: MockupTemplate) => void;
  selectedObjectIds: string[];
  widthCm: number;
  heightCm: number;
  quantity: number;
  customerType: PricingCustomerType;
  setWidthCm: (v: number) => void;
  setHeightCm: (v: number) => void;
  setQuantity: (v: number) => void;
  setCustomerType: (v: PricingCustomerType) => void;
  pricing: PodPricingSnapshot | null;
  pricingLoading: boolean;
  pricingError: string | null;
  pricingUpdatedAt: number | null;
  recalculatePricing: () => Promise<void>;
};

const PodCoreContext = createContext<PodCoreContextValue | null>(null);

const PRICING_DEBOUNCE_MS = 400;

export function PodCoreProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<PodCanvasEngine | null>(null);
  const templateRef = useRef<MockupTemplate>(getDefaultMockupTemplate());
  const [tick, setTick] = useState(0);
  const [mockupTemplate, setMockupTemplateState] = useState<MockupTemplate>(getDefaultMockupTemplate());
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [widthCm, setWidthCm] = useState(getDefaultMockupTemplate().defaultSize.widthCm);
  const [heightCm, setHeightCm] = useState(getDefaultMockupTemplate().defaultSize.heightCm);
  const [quantity, setQuantity] = useState(getDefaultMockupTemplate().defaultQuantity);
  const [customerType, setCustomerType] = useState<PricingCustomerType>("RETAIL");
  const [pricing, setPricing] = useState<PodPricingSnapshot | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricingUpdatedAt, setPricingUpdatedAt] = useState<number | null>(null);
  const pricingSeq = useRef(0);

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

  const recalculatePricing = useCallback(async () => {
    const tpl = templateRef.current;
    const seq = ++pricingSeq.current;
    setPricingLoading(true);
    setPricingError(null);
    try {
      const payload = buildPricingBridgePayload(
        tpl,
        tpl.formulaHint === "PIECE" ? 0 : widthCm,
        tpl.formulaHint === "PIECE" ? 0 : heightCm,
        quantity,
        customerType
      );
      const result = await fetchPodPricing(payload);
      if (seq !== pricingSeq.current) return;
      setPricing(result.pricing);
      setPricingUpdatedAt(Date.now());
    } catch (e) {
      if (seq !== pricingSeq.current) return;
      setPricing(null);
      setPricingError(e instanceof Error ? e.message : "Fiyat hatası");
    } finally {
      if (seq === pricingSeq.current) setPricingLoading(false);
    }
  }, [widthCm, heightCm, quantity, customerType]);

  const setMockupTemplate = useCallback(
    (t: MockupTemplate) => {
      templateRef.current = t;
      setMockupTemplateState(t);
      setWidthCm(t.defaultSize.widthCm);
      setHeightCm(t.defaultSize.heightCm);
      setQuantity(t.defaultQuantity);
      engineRef.current?.setMockupTemplate(t);
      refresh();
    },
    [refresh]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      void recalculatePricing();
    }, PRICING_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [mockupTemplate, widthCm, heightCm, quantity, customerType, tick, recalculatePricing]);

  const value = useMemo(
    () => ({
      engine: engineRef.current,
      tick,
      refresh,
      mockupTemplate,
      setMockupTemplate,
      selectedObjectIds,
      widthCm,
      heightCm,
      quantity,
      customerType,
      setWidthCm,
      setHeightCm,
      setQuantity,
      setCustomerType,
      pricing,
      pricingLoading,
      pricingError,
      pricingUpdatedAt,
      recalculatePricing,
    }),
    [
      tick,
      refresh,
      mockupTemplate,
      setMockupTemplate,
      selectedObjectIds,
      widthCm,
      heightCm,
      quantity,
      customerType,
      pricing,
      pricingLoading,
      pricingError,
      pricingUpdatedAt,
      recalculatePricing,
    ]
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
