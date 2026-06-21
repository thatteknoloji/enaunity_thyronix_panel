#!/usr/bin/env node
/**
 * turkiyeapi.dev → scripts/data/turkiye-geo-full.json
 * 81 il + tüm ilçeler (koordinat dahil)
 */
import { writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "data/turkiye-geo-full.json");

const res = await fetch("https://turkiyeapi.dev/api/v1/provinces");
if (!res.ok) throw new Error(`API ${res.status}`);
const json = await res.json();
if (json.status !== "OK" || !Array.isArray(json.data)) throw new Error("Unexpected API shape");

const provinces = json.data.map((p) => ({
  plateCode: String(p.id).padStart(2, "0"),
  name: p.name,
  latitude: p.coordinates?.latitude ?? null,
  longitude: p.coordinates?.longitude ?? null,
  districts: (p.districts || []).map((d) => ({
    name: d.name,
    latitude: null,
    longitude: null,
  })),
}));

const districtTotal = provinces.reduce((n, p) => n + p.districts.length, 0);

writeFileSync(
  OUT,
  JSON.stringify({ source: "turkiyeapi.dev", fetchedAt: new Date().toISOString(), provinces }, null, 0)
);

console.log(`✓ ${provinces.length} il, ${districtTotal} ilçe → ${OUT}`);
