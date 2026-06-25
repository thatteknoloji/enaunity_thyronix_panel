/** Faz 2 — mevcut lib/pod project/sipariş akışı bağlantısı */
export type PodOrderBridgeInput = {
  designDocumentJson: string;
  templateId?: string;
  dealerId?: string;
};

export function buildOrderBridgePayload(): PodOrderBridgeInput {
  throw new Error("ENA_POD_CORE: pod-order-bridge V2 fazında aktif olacak");
}

export function isOrderBridgeReady(): boolean {
  return false;
}
