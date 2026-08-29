import dataset from "@/data/delhi-ncr.json";
import type { Category, LocalOptionSchema } from "@/schemas/analysis";
import type { z } from "zod";

type LocalOption = z.infer<typeof LocalOptionSchema>;

type Facility = {
  name: string;
  type: string;
  area: string;
  coords: [number, number];
  accepts: string[];
  contact: string;
  url: string;
  doorstep: boolean;
  pays_user: boolean;
};

const FACILITIES = dataset.facilities as Facility[];

export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

const TYPE_BY_CATEGORY: Record<Category, string[]> = {
  electronics: ["electronics-buyback", "ewaste-recycler", "ewaste-collection"],
  battery: ["ewaste-recycler", "ewaste-collection", "hazardous-waste"],
  chemical: ["hazardous-waste"],
  food_scraps: ["gaushala", "compost-supplier"],
  expired_food: ["compost-supplier", "hazardous-waste"],
  packaging: ["scrap-dealer"],
  paper: ["scrap-dealer"],
  glass: ["scrap-dealer"],
  textile: ["donation-ngo", "scrap-dealer"],
  other: ["scrap-dealer", "donation-ngo"],
};

const DELHI_CENTRE: [number, number] = [28.6139, 77.209];

export function findLocalOptions(category: Category, opts?: { coords?: [number, number]; limit?: number }): LocalOption[] {
  const types = new Set(TYPE_BY_CATEGORY[category] ?? []);
  const origin = opts?.coords ?? DELHI_CENTRE;
  const limit = opts?.limit ?? 3;

  return FACILITIES.filter((f) => types.has(f.type))
    .map((f) => ({ f, d: haversineKm(origin, f.coords) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map(({ f, d }) => ({
      name: f.name,
      type: f.type.replace(/-/g, " "),
      area: f.area,
      distance_km: opts?.coords ? d : undefined,
      contact: f.contact || undefined,
      url: f.url || undefined,
      note: [f.doorstep ? "doorstep pickup" : null, f.pays_user ? "pays you" : null, `accepts: ${f.accepts.slice(0, 3).join(", ")}`]
        .filter(Boolean)
        .join(" · "),
    }));
}

export const LOCAL_REGION = dataset.region;
