import type { EditField } from "@/resources/fields";
import { isHttpsUrl } from "@/lib/format";

/** Raw form state: strings for text-like inputs, booleans for checkboxes. */
export type FormValues = Record<string, string | boolean>;

export type ApiValue = string | number | boolean | null;

export interface FieldChange {
  key: string;
  label: string;
  from: unknown;
  to: ApiValue;
}

export const initialFormValues = (fields: EditField[], record: Record<string, unknown>): FormValues => {
  const values: FormValues = {};
  for (const field of fields) {
    const original = record[field.key];
    if (field.type === "checkbox") {
      values[field.key] = original === true;
    } else {
      values[field.key] = original === null || original === undefined ? "" : String(original);
    }
  }
  return values;
};

/**
 * Converts a form value into the value sent to the API, preserving its type:
 * booleans stay booleans, numbers are numbers, empty nullable fields are null.
 */
export const parseFieldValue = (
  field: EditField,
  raw: string | boolean | undefined,
): { value: ApiValue } | { error: string } => {
  if (field.type === "checkbox") {
    return { value: raw === true };
  }

  const text = typeof raw === "string" ? raw : "";
  const trimmed = field.type === "textarea" ? text : text.trim();
  const isEmpty = trimmed.trim() === "";

  if (isEmpty) {
    return field.nullable ? { value: null } : { error: `${field.label} is required.` };
  }

  if (field.maxLength !== undefined && trimmed.length > field.maxLength) {
    return { error: `${field.label} must be at most ${field.maxLength} characters.` };
  }

  if (field.type === "number") {
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) return { error: `${field.label} must be a number.` };
    if (field.integer && !Number.isInteger(numeric)) return { error: `${field.label} must be a whole number.` };
    if (field.min !== undefined && numeric < field.min) return { error: `${field.label} must be at least ${field.min}.` };
    if (field.max !== undefined && numeric > field.max) return { error: `${field.label} must be at most ${field.max}.` };
    return { value: numeric };
  }

  if (field.type === "url") {
    if (!isHttpsUrl(trimmed)) return { error: `${field.label} must be a valid https:// URL.` };
    return { value: trimmed };
  }

  return { value: trimmed };
};

const sameValue = (field: EditField, next: ApiValue, original: unknown): boolean => {
  const originalEmpty = original === null || original === undefined || original === "";
  if (next === null) return originalEmpty;
  if (originalEmpty) return field.type === "checkbox" ? next === false : false;

  if (field.type === "number") {
    const originalNumber = Number(original);
    return Number.isFinite(originalNumber) && originalNumber === next;
  }
  if (field.type === "checkbox") return next === (original === true);
  return next === original;
};

/**
 * Validates all editable fields and returns only the ones that changed.
 * Read-only fields are never included.
 */
export const computeChanges = (
  fields: EditField[],
  values: FormValues,
  record: Record<string, unknown>,
): { changes: FieldChange[]; errors: Record<string, string> } => {
  const changes: FieldChange[] = [];
  const errors: Record<string, string> = {};
  const initial = initialFormValues(fields, record);

  for (const field of fields) {
    if (field.readOnly) continue;
    // Untouched inputs are neither validated nor sent.
    if (values[field.key] === initial[field.key]) continue;
    const parsed = parseFieldValue(field, values[field.key]);
    if ("error" in parsed) {
      errors[field.key] = parsed.error;
      continue;
    }
    const original = record[field.key];
    if (!sameValue(field, parsed.value, original)) {
      changes.push({ key: field.key, label: field.label, from: original ?? null, to: parsed.value });
    }
  }

  return { changes, errors };
};

export const describeValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "(empty)";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};
