/** Üretim stüdyosu clipart — SVG path tabanlı, canvas'a Path olarak eklenir */
export type PodClipartItem = {
  id: string;
  name: string;
  category: string;
  path: string;
  width: number;
  height: number;
  fill: string;
};

export const POD_CLIPART_LIBRARY: PodClipartItem[] = [
  {
    id: "star",
    name: "Yıldız",
    category: "Simgeler",
    path: "M50 5 L61 38 L95 38 L68 58 L79 91 L50 71 L21 91 L32 58 L5 38 L39 38 Z",
    width: 100,
    height: 96,
    fill: "#f59e0b",
  },
  {
    id: "heart",
    name: "Kalp",
    category: "Simgeler",
    path: "M50 88 C20 62 2 42 2 26 C2 12 12 2 26 2 C36 2 44 8 50 16 C56 8 64 2 74 2 C88 2 98 12 98 26 C98 42 80 62 50 88 Z",
    width: 100,
    height: 90,
    fill: "#ef4444",
  },
  {
    id: "arrow-right",
    name: "Ok",
    category: "Simgeler",
    path: "M10 45 H70 L70 25 L95 50 L70 75 L70 55 H10 Z",
    width: 100,
    height: 100,
    fill: "#3b82f6",
  },
  {
    id: "badge",
    name: "Rozet",
    category: "Simgeler",
    path: "M50 5 L58 32 L86 32 L63 48 L71 75 L50 58 L29 75 L37 48 L14 32 L42 32 Z",
    width: 100,
    height: 80,
    fill: "#8b5cf6",
  },
  {
    id: "circle-ring",
    name: "Halka",
    category: "Şekiller",
    path: "M50 10 A40 40 0 1 1 49.9 10 M50 22 A28 28 0 1 0 50.1 22",
    width: 100,
    height: 100,
    fill: "#0ea5e9",
  },
  {
    id: "leaf",
    name: "Yaprak",
    category: "Doğa",
    path: "M50 90 C15 70 5 40 20 15 C35 5 55 8 70 20 C85 35 80 60 50 90 Z",
    width: 90,
    height: 95,
    fill: "#22c55e",
  },
];
