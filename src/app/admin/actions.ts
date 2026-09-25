"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hashPassword, requireUser } from "@/lib/auth";
import {
  BATCH_STATUSES,
  CARE_LEVELS,
  MANUAL_EVENT_TYPES,
  SPECIAL_ORDER_STATUSES,
  SPECIES_CATEGORIES,
  TANK_PURPOSES,
  TEMPERAMENTS,
  USER_ROLES,
  WATER_TYPES,
} from "@/lib/constants";
import { db } from "@/lib/db";
import {
  checkbox,
  formError,
  nonNegativeInt,
  nonNegativeNumber,
  optionalDate,
  optionalInt,
  optionalNumber,
  optionalString,
  parseForm,
  type ActionState,
} from "@/lib/form";
import { changeBatchStatus, linkBatchToVariant, moveBatch, recordQuantityChange } from "@/lib/livestock";

// All back-office mutations. Every action re-checks the session with
// requireUser(); the proxy alone is not a security boundary.

const id = z.string().min(1);

function done(message: string, ...paths: string[]): ActionState {
  for (const p of paths) revalidatePath(p);
  revalidatePath("/admin");
  return { ok: true, message };
}

function synced(result: { synced: boolean; warning?: string }, message: string, ...paths: string[]): ActionState {
  const state = done(result.synced ? `${message} Synced to Shopify.` : message, ...paths);
  return result.warning ? { ok: false, message: result.warning } : state;
}

// --- Tanks -----------------------------------------------------------------

const tankSchema = z.object({
  name: z.string().trim().min(1).max(100),
  system: optionalString,
  waterType: z.enum(WATER_TYPES),
  purpose: z.enum(TANK_PURPOSES),
  volumeGallons: z.coerce.number().positive(),
  location: optionalString,
  notes: optionalString,
});

export async function createTank(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("MANAGER");
  const parsed = parseForm(tankSchema, formData);
  if (!parsed.success) return formError(parsed.error);
  if (await db.tank.findUnique({ where: { name: parsed.data.name } })) {
    return { ok: false, message: "A tank with that name already exists." };
  }
  await db.tank.create({ data: parsed.data });
  return done(`Added ${parsed.data.name}.`, "/admin/tanks");
}

export async function updateTank(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("MANAGER");
  const parsed = parseForm(tankSchema.extend({ id, active: checkbox }), formData);
  if (!parsed.success) return formError(parsed.error);
  const { id: tankId, ...data } = parsed.data;
  await db.tank.update({ where: { id: tankId }, data });
  return done("Tank updated.", "/admin/tanks", `/admin/tanks/${tankId}`);
}

// --- Water tests -----------------------------------------------------------

const waterTestSchema = z.object({
  tankId: id,
  testedAt: optionalDate,
  temperatureF: optionalNumber,
  ph: optionalNumber,
  ammonia: optionalNumber,
  nitrite: optionalNumber,
  nitrate: optionalNumber,
  salinity: optionalNumber,
  alkalinity: optionalNumber,
  calcium: optionalNumber,
  magnesium: optionalNumber,
  phosphate: optionalNumber,
  notes: optionalString,
});

export async function logWaterTest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseForm(waterTestSchema, formData);
  if (!parsed.success) return formError(parsed.error);
  const { notes, tankId, testedAt, ...readings } = parsed.data;
  if (Object.values(readings).every((v) => v === undefined)) {
    return { ok: false, message: "Enter at least one reading." };
  }
  await db.waterTest.create({ data: { ...readings, notes, tankId, testedAt: testedAt ?? new Date(), userId: user.id } });
  return done("Water test logged.", `/admin/tanks/${tankId}`, "/admin/tanks");
}

// --- Species ---------------------------------------------------------------

const speciesSchema = z.object({
  commonName: z.string().trim().min(1).max(120),
  scientificName: optionalString,
  category: z.enum(SPECIES_CATEGORIES),
  waterType: z.enum(WATER_TYPES),
  careLevel: z.enum(CARE_LEVELS),
  temperament: z.enum(TEMPERAMENTS),
  reefSafe: z.preprocess((v) => (v === "yes" ? true : v === "no" ? false : undefined), z.boolean().optional()),
  minTankGallons: nonNegativeInt,
  maxSizeInches: nonNegativeNumber,
  diet: optionalString,
  notes: optionalString,
});

export async function createSpecies(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = parseForm(speciesSchema, formData);
  if (!parsed.success) return formError(parsed.error);
  const exists = await db.species.findFirst({
    where: { commonName: parsed.data.commonName, scientificName: parsed.data.scientificName ?? null },
  });
  if (exists) return { ok: false, message: "That species is already in the catalog." };
  await db.species.create({ data: parsed.data });
  return done(`Added ${parsed.data.commonName}.`, "/admin/species", "/admin/livestock");
}

// --- Livestock -------------------------------------------------------------

const receiveSchema = z.object({
  speciesId: id,
  tankId: id,
  quantity: z.coerce.number().int().positive().max(10_000),
  unitCost: nonNegativeNumber,
  supplier: optionalString,
  quarantineDays: nonNegativeInt,
  shopifyVariantId: optionalString,
  notes: optionalString,
});

export async function receiveLivestock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseForm(receiveSchema, formData);
  if (!parsed.success) return formError(parsed.error);
  const { unitCost, quarantineDays, quantity, shopifyVariantId, ...rest } = parsed.data;
  const batch = await db.livestockBatch.create({
    data: {
      ...rest,
      quantity,
      receivedQuantity: quantity,
      unitCostCents: unitCost === undefined ? null : Math.round(unitCost * 100),
      status: "QUARANTINE",
      quarantineUntil: quarantineDays ? new Date(Date.now() + quarantineDays * 86_400_000) : null,
      events: { create: { type: "RECEIVED", quantityDelta: quantity, userId: user.id, note: rest.supplier } },
    },
  });
  // New arrivals start in quarantine, so linking pushes nothing to Shopify yet.
  if (shopifyVariantId) await linkBatchToVariant({ batchId: batch.id, variantId: shopifyVariantId, userId: user.id });
  return done(`Received ${quantity}. Batch is in quarantine.`, "/admin/livestock", `/admin/tanks/${rest.tankId}`);
}

const eventSchema = z.object({
  batchId: id,
  type: z.enum(MANUAL_EVENT_TYPES),
  quantity: z.coerce.number().int().min(0).max(10_000),
  // ADJUSTMENT can go either way; SOLD/LOSS always remove animals.
  direction: z.enum(["add", "remove"]).default("remove"),
  note: optionalString,
});

export async function recordLivestockEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseForm(eventSchema, formData);
  if (!parsed.success) return formError(parsed.error);
  const { batchId, type, quantity, direction, note } = parsed.data;

  if (type === "TREATMENT") {
    if (!note) return { ok: false, message: "Describe the treatment." };
    await db.livestockEvent.create({ data: { batchId, type, note, userId: user.id } });
    return done("Treatment logged.", `/admin/livestock/${batchId}`);
  }
  if (quantity === 0) return { ok: false, message: "Enter a quantity." };
  const delta = type === "ADJUSTMENT" && direction === "add" ? quantity : -quantity;
  const result = await recordQuantityChange({ batchId, type, quantityDelta: delta, note, userId: user.id });
  return synced(result, "Saved.", `/admin/livestock/${batchId}`, "/admin/livestock");
}

export async function setBatchStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseForm(z.object({ batchId: id, status: z.enum(BATCH_STATUSES) }), formData);
  if (!parsed.success) return formError(parsed.error);
  const result = await changeBatchStatus({ ...parsed.data, userId: user.id });
  return synced(result, "Status updated.", `/admin/livestock/${parsed.data.batchId}`, "/admin/livestock");
}

export async function moveLivestock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseForm(z.object({ batchId: id, tankId: id }), formData);
  if (!parsed.success) return formError(parsed.error);
  await moveBatch({ ...parsed.data, userId: user.id });
  return done("Batch moved.", `/admin/livestock/${parsed.data.batchId}`, "/admin/tanks");
}

export async function linkVariant(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("MANAGER");
  const parsed = parseForm(z.object({ batchId: id, variantId: optionalString }), formData);
  if (!parsed.success) return formError(parsed.error);
  const result = await linkBatchToVariant({
    batchId: parsed.data.batchId,
    variantId: parsed.data.variantId ?? null,
    userId: user.id,
  });
  return synced(result, "Shopify link saved.", `/admin/livestock/${parsed.data.batchId}`);
}

// --- Tasks -----------------------------------------------------------------

const taskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: optionalString,
  tankId: optionalString,
  assigneeId: optionalString,
  dueAt: z.coerce.date(),
  repeatDays: optionalInt.pipe(z.number().int().positive().max(365).optional()),
});

export async function createTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = parseForm(taskSchema, formData);
  if (!parsed.success) return formError(parsed.error);
  await db.maintenanceTask.create({ data: parsed.data });
  return done("Task added.", "/admin/tasks");
}

export async function completeTask(formData: FormData) {
  const user = await requireUser();
  const taskId = id.parse(formData.get("taskId"));
  await db.$transaction(async (tx) => {
    const task = await tx.maintenanceTask.findUniqueOrThrow({ where: { id: taskId } });
    if (task.completedAt) return;
    const now = new Date();
    await tx.maintenanceTask.update({ where: { id: taskId }, data: { completedAt: now, completedById: user.id } });
    if (task.repeatDays) {
      // Schedule from today so an overdue task doesn't pile up repeats.
      await tx.maintenanceTask.create({
        data: {
          title: task.title,
          description: task.description,
          tankId: task.tankId,
          assigneeId: task.assigneeId,
          repeatDays: task.repeatDays,
          dueAt: new Date(now.getTime() + task.repeatDays * 86_400_000),
        },
      });
    }
  });
  revalidatePath("/admin/tasks");
  revalidatePath("/admin");
}

// --- Special orders --------------------------------------------------------

const specialOrderSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  customerEmail: optionalString.pipe(z.string().email().optional()),
  customerPhone: optionalString,
  request: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().int().positive().default(1),
  deposit: nonNegativeNumber,
  notes: optionalString,
});

export async function createSpecialOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const parsed = parseForm(specialOrderSchema, formData);
  if (!parsed.success) return formError(parsed.error);
  const { deposit, ...data } = parsed.data;
  await db.specialOrder.create({ data: { ...data, depositCents: Math.round((deposit ?? 0) * 100) } });
  return done("Special order created.", "/admin/special-orders");
}

export async function setSpecialOrderStatus(formData: FormData) {
  await requireUser();
  const { orderId, status } = z
    .object({ orderId: id, status: z.enum(SPECIAL_ORDER_STATUSES) })
    .parse(Object.fromEntries(formData));
  await db.specialOrder.update({ where: { id: orderId }, data: { status } });
  revalidatePath("/admin/special-orders");
  revalidatePath("/admin");
}

// --- Staff -----------------------------------------------------------------

const staffSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(USER_ROLES),
  password: z.string().min(10, "must be at least 10 characters"),
});

export async function createStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser("OWNER");
  const parsed = parseForm(staffSchema, formData);
  if (!parsed.success) return formError(parsed.error);
  const { password, ...data } = parsed.data;
  if (await db.user.findUnique({ where: { email: data.email } })) {
    return { ok: false, message: "That email already has an account." };
  }
  await db.user.create({ data: { ...data, passwordHash: await hashPassword(password) } });
  return done(`Added ${data.name}.`, "/admin/staff");
}

export async function setStaffActive(formData: FormData) {
  const owner = await requireUser("OWNER");
  const { userId, active } = z
    .object({ userId: id, active: z.enum(["true", "false"]).transform((v) => v === "true") })
    .parse(Object.fromEntries(formData));
  if (userId === owner.id) throw new Error("You can't deactivate yourself.");
  await db.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/admin/staff");
}
