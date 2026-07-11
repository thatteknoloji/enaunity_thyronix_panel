const ARAS_API = process.env.ARAS_API_URL || "";
const ARAS_KEY = process.env.ARAS_API_KEY || "";
const YURTICI_API = process.env.YURTICI_API_URL || "";
const YURTICI_KEY = process.env.YURTICI_API_KEY || "";

interface TrackingResult {
  status: string;
  statusLabel: string;
  events: Array<{ date: string; location: string; status: string }>;
  delivered: boolean;
}

export async function getTrackingInfo(carrier: string, trackingNumber: string): Promise<TrackingResult | null> {
  if (!trackingNumber) return null;

  try {
    if (carrier === "Aras Kargo" && ARAS_API) {
      const res = await fetch(`${ARAS_API}/track?code=${trackingNumber}`, {
        headers: { Authorization: `Bearer ${ARAS_KEY}` },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          status: data.status || "in_transit",
          statusLabel: data.status_label || "Yolda",
          events: data.events || [],
          delivered: data.delivered || false,
        };
      }
    }

    if (carrier === "Yurtiçi Kargo" && YURTICI_API) {
      const res = await fetch(`${YURTICI_API}/shipment/${trackingNumber}`, {
        headers: { "X-API-Key": YURTICI_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          status: data.status || "in_transit",
          statusLabel: data.currentStatus || "Yolda",
          events: (data.history || []).map((h: any) => ({ date: h.date, location: h.branch, status: h.status })),
          delivered: data.delivered || false,
        };
      }
    }
  } catch {
    // API unavailable
  }

  return null;
}

export async function createShipment(carrier: string, order: { address: string; trackingNumber?: string }): Promise<{ trackingNumber: string; label?: string } | null> {
  if (!order.address) return null;

  try {
    if (carrier === "Aras Kargo" && ARAS_API) {
      const res = await fetch(`${ARAS_API}/shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ARAS_KEY}` },
        body: JSON.stringify({ address: order.address }),
      });
      if (res.ok) {
        const data = await res.json();
        return { trackingNumber: data.barcode || data.tracking_number || "", label: data.label_url };
      }
    }
  } catch {
    // API unavailable
  }

  return null;
}

export const CARRIERS = [
  { value: "PTT", label: "PTT Kargo" },
  { value: "Aras Kargo", label: "Aras Kargo" },
  { value: "Yurtiçi Kargo", label: "Yurtiçi Kargo" },
  { value: "MNG Kargo", label: "MNG Kargo" },
  { value: "Sürat Kargo", label: "Sürat Kargo" },
  { value: "UPS", label: "UPS" },
  { value: "FedEx", label: "FedEx" },
  { value: "Diğer", label: "Diğer" },
];
