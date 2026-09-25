import { z } from "zod";

// Helpers for parsing HTML form submissions with zod.

const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const optionalString = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : v),
  z.string().max(2000).optional(),
);
export const optionalNumber = z.preprocess(blankToUndefined, z.coerce.number().finite().optional());
export const optionalInt = z.preprocess(blankToUndefined, z.coerce.number().int().optional());
export const optionalDate = z.preprocess(blankToUndefined, z.coerce.date().optional());
export const nonNegativeNumber = optionalNumber.pipe(z.number().min(0).optional());
export const nonNegativeInt = optionalInt.pipe(z.number().int().min(0).optional());
export const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

export type ActionState = { ok: boolean; message: string } | null;

export function formError(error: z.ZodError): ActionState {
  const issue = error.issues[0];
  const field = issue?.path.join(".");
  return { ok: false, message: field ? `${field}: ${issue.message}` : (issue?.message ?? "Invalid input") };
}

export function parseForm<T extends z.ZodType>(schema: T, formData: FormData) {
  return schema.safeParse(Object.fromEntries(formData));
}
