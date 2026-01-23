export const toSafeString = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
};

export const normalizeNumber = (value: any): number => {
  if (!value) return 0;
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
};

export const normalizeDate = (value: any): Date | null => {
  if (!value) return null;

  if (typeof value === "number") {
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }

  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

export const normalizeBoolean = (value: any): boolean => {
  if (!value) return false;
  const str = String(value).toLowerCase().trim();
  return ["true", "yes", "1", "approved", "pending"].includes(str);
};
