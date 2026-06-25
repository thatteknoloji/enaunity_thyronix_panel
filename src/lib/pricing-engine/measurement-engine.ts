export type NormalizedMeasurement = {
  widthCm: number;
  heightCm: number;
  lengthMeter: number;
  quantity: number;
  areaM2: number;
  areaCm2: number;
};

export function normalizeMeasurement(input: {
  widthCm?: number;
  heightCm?: number;
  lengthMeter?: number;
  quantity?: number;
}): NormalizedMeasurement {
  const widthCm = Math.max(0, Number(input.widthCm) || 0);
  const heightCm = Math.max(0, Number(input.heightCm) || 0);
  const lengthMeter = Math.max(0, Number(input.lengthMeter) || 0);
  const quantity = Math.max(1, Math.floor(Number(input.quantity) || 1));
  const areaCm2 = widthCm * heightCm;
  const areaM2 = calculateAreaM2(widthCm, heightCm);
  return { widthCm, heightCm, lengthMeter, quantity, areaM2, areaCm2 };
}

export function calculateAreaM2(widthCm: number, heightCm: number): number {
  const w = Math.max(0, Number(widthCm) || 0);
  const h = Math.max(0, Number(heightCm) || 0);
  return (w * h) / 10000;
}

export function applyRounding(value: number, mode: string): number {
  const v = Number(value) || 0;
  switch (mode) {
    case "NEAREST_1":
      return Math.round(v);
    case "NEAREST_5":
      return Math.round(v / 5) * 5;
    case "NEAREST_10":
      return Math.round(v / 10) * 10;
    case "NEAREST_50":
      return Math.round(v / 50) * 50;
    case "NEAREST_100":
      return Math.round(v / 100) * 100;
    default:
      return Math.round(v * 100) / 100;
  }
}
