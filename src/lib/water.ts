import type { WaterType } from "./constants";

// Water chemistry targets per water type and a helper that grades a test.
// Ranges are sensible defaults for a retail livestock system; tune them for
// your own store.

export const WATER_PARAMETERS = [
  { key: "temperatureF", label: "Temp", unit: "°F" },
  { key: "ph", label: "pH", unit: "" },
  { key: "ammonia", label: "Ammonia", unit: "ppm" },
  { key: "nitrite", label: "Nitrite", unit: "ppm" },
  { key: "nitrate", label: "Nitrate", unit: "ppm" },
  { key: "salinity", label: "Salinity", unit: "SG" },
  { key: "alkalinity", label: "Alk", unit: "dKH" },
  { key: "calcium", label: "Calcium", unit: "ppm" },
  { key: "magnesium", label: "Mag", unit: "ppm" },
  { key: "phosphate", label: "Phosphate", unit: "ppm" },
] as const;

export type WaterParameter = (typeof WATER_PARAMETERS)[number]["key"];
export type WaterReading = Partial<Record<WaterParameter, number | null>>;

/** `ok` is the target band; anything outside `warn` is critical. */
type Range = { ok: [number, number]; warn: [number, number] };

const common: Partial<Record<WaterParameter, Range>> = {
  ammonia: { ok: [0, 0.05], warn: [0, 0.25] },
  nitrite: { ok: [0, 0.05], warn: [0, 0.25] },
};

export const WATER_TARGETS: Record<WaterType, Partial<Record<WaterParameter, Range>>> = {
  FRESHWATER: {
    ...common,
    temperatureF: { ok: [74, 80], warn: [70, 84] },
    ph: { ok: [6.5, 7.8], warn: [6.0, 8.2] },
    nitrate: { ok: [0, 40], warn: [0, 80] },
  },
  BRACKISH: {
    ...common,
    temperatureF: { ok: [74, 80], warn: [70, 84] },
    ph: { ok: [7.5, 8.4], warn: [7.2, 8.6] },
    nitrate: { ok: [0, 40], warn: [0, 80] },
    salinity: { ok: [1.005, 1.012], warn: [1.002, 1.016] },
  },
  SALTWATER: {
    ...common,
    temperatureF: { ok: [76, 80], warn: [74, 83] },
    ph: { ok: [8.0, 8.4], warn: [7.8, 8.6] },
    nitrate: { ok: [0, 25], warn: [0, 50] },
    salinity: { ok: [1.02, 1.026], warn: [1.018, 1.027] },
    alkalinity: { ok: [7, 11], warn: [6, 12] },
  },
  REEF: {
    ...common,
    temperatureF: { ok: [76, 80], warn: [74, 82] },
    ph: { ok: [8.0, 8.4], warn: [7.8, 8.5] },
    nitrate: { ok: [1, 10], warn: [0, 25] },
    salinity: { ok: [1.024, 1.026], warn: [1.022, 1.027] },
    alkalinity: { ok: [7.5, 9.5], warn: [6.5, 11] },
    calcium: { ok: [400, 450], warn: [360, 500] },
    magnesium: { ok: [1250, 1400], warn: [1150, 1500] },
    phosphate: { ok: [0.02, 0.1], warn: [0, 0.2] },
  },
};

export type Grade = "ok" | "warn" | "critical";

export type ParameterResult = {
  key: WaterParameter;
  label: string;
  unit: string;
  value: number;
  grade: Grade;
  target?: [number, number];
};

const within = (v: number, [lo, hi]: [number, number]) => v >= lo && v <= hi;

export function gradeParameter(waterType: WaterType, key: WaterParameter, value: number): Grade {
  const range = WATER_TARGETS[waterType][key];
  if (!range) return "ok";
  if (within(value, range.ok)) return "ok";
  if (within(value, range.warn)) return "warn";
  return "critical";
}

export function evaluateWaterTest(waterType: WaterType, reading: WaterReading): ParameterResult[] {
  const results: ParameterResult[] = [];
  for (const param of WATER_PARAMETERS) {
    const value = reading[param.key];
    if (value === null || value === undefined || Number.isNaN(value)) continue;
    results.push({
      key: param.key,
      label: param.label,
      unit: param.unit,
      value,
      grade: gradeParameter(waterType, param.key, value),
      target: WATER_TARGETS[waterType][param.key]?.ok,
    });
  }
  return results;
}

export function worstGrade(results: Pick<ParameterResult, "grade">[]): Grade {
  if (results.some((r) => r.grade === "critical")) return "critical";
  if (results.some((r) => r.grade === "warn")) return "warn";
  return "ok";
}
