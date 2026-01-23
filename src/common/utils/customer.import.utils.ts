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

export const normalizePhones = (value: any): string[] => {
  const str = toSafeString(value);
  if (!str) return [];

  return str
    .split(/[,/;|\n]/)
    .map(v => v.replace(/\D/g, ""))
    .filter(v => v.length >= 8)
    .map(v => (v.length >= 10 ? v.slice(-10) : v));
};

export const normalizeEmails = (value: any): string[] => {
  const str = toSafeString(value);
  if (!str) return [];

  return str
    .split(/[,/;|\n\s]/)
    .map(v => v.trim())
    .filter(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
};

export const parseContacts = (row: any) => {
  const phones = normalizePhones(row.contactPhone);
  const emails = normalizeEmails(row.contactEmail);

  const max = Math.max(phones.length, emails.length);
  const contacts = [];

  for (let i = 0; i < max; i++) {
    contacts.push({
      phone: phones[i] || null,
      email: emails[i] || null,
    });
  }

  return contacts;
};
