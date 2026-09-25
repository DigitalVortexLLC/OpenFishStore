// Allowed values for string "enum" columns in prisma/schema.prisma.

export const WATER_TYPES = ["FRESHWATER", "SALTWATER", "REEF", "BRACKISH"] as const;
export type WaterType = (typeof WATER_TYPES)[number];

export const TANK_PURPOSES = ["DISPLAY", "SALES", "QUARANTINE", "HOLDING"] as const;
export type TankPurpose = (typeof TANK_PURPOSES)[number];

export const SPECIES_CATEGORIES = ["FISH", "INVERTEBRATE", "CORAL", "PLANT"] as const;
export const CARE_LEVELS = ["EASY", "MODERATE", "EXPERT"] as const;
export const TEMPERAMENTS = ["PEACEFUL", "SEMI_AGGRESSIVE", "AGGRESSIVE"] as const;

export const BATCH_STATUSES = ["QUARANTINE", "AVAILABLE", "HOLD", "SOLD_OUT"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

// Event types staff can record against a batch by hand.
export const MANUAL_EVENT_TYPES = ["SOLD", "LOSS", "ADJUSTMENT", "TREATMENT"] as const;
export type ManualEventType = (typeof MANUAL_EVENT_TYPES)[number];

export const SPECIAL_ORDER_STATUSES = [
  "REQUESTED",
  "ORDERED",
  "ARRIVED",
  "NOTIFIED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type SpecialOrderStatus = (typeof SPECIAL_ORDER_STATUSES)[number];

export const USER_ROLES = ["OWNER", "MANAGER", "STAFF"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export function label(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
