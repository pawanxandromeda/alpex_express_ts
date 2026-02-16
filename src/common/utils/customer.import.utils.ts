// Auto-mapping for customer import headers (like PPIC)
const CUSTOMER_FIELD_ALIASES: Record<string, string[]> = {
  customerName: ["customer name", "name", "party name", "company name", "customer"],
  gstrNo: ["gst", "gst no", "gst number", "gstn", "gstin", "tax id"],
  paymentTerms: ["payment terms", "terms", "pay terms"],
  throughVia: ["through via", "via", "through", "agent", "broker"],
  drugLicense: ["drug license", "dl no", "drug license number", "license no"],
  dlExpiry: ["dl expiry", "license expiry", "dl expiry date", "expiry date"],
  address: ["address", "addr", "location", "city", "place"],
  contactName: ["contact name", "person name", "contact person"],
  contactPhone: ["contact phone", "phone", "mobile", "contact no", "phone number", "mobile number"],
  contactEmail: ["contact email", "email", "mail", "email address"],
  remarks: ["remarks", "note", "notes", "comment"],
  relationshipStatus: ["relationship status", "status", "relation"],
  isBlacklisted: ["blacklisted", "is blacklisted", "blacklist"],
  blacklistReason: ["blacklist reason", "reason", "blacklisted reason"],
  creditLimit: ["credit limit", "limit", "credit"],
  kycProfile: ["kyc", "kyc profile"],
  gstCopy: ["gst copy", "gst document", "gst file"],
};

export function buildCustomerMapping(sheetHeaders: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const sheetHeader of sheetHeaders) {
    const headerLower = sheetHeader.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(CUSTOMER_FIELD_ALIASES)) {
      for (const alias of aliases) {
        if (headerLower === alias.toLowerCase()) {
          mapping[field] = sheetHeader;
          break;
        }
      }
      if (mapping[field]) break;
    }
  }
  return mapping;
}
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
