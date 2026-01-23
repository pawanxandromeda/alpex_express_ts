"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseContacts = exports.normalizeEmails = exports.normalizePhones = exports.normalizeDate = exports.normalizeNumber = exports.toSafeString = void 0;
const toSafeString = (value) => {
    if (value === null || value === undefined)
        return null;
    if (typeof value === "string")
        return value.trim();
    if (typeof value === "number")
        return String(value);
    if (typeof value === "boolean")
        return value ? "true" : "false";
    if (value instanceof Date)
        return value.toISOString();
    return String(value).trim();
};
exports.toSafeString = toSafeString;
const normalizeNumber = (value) => {
    if (!value)
        return 0;
    const n = Number(String(value).replace(/[^0-9.-]/g, ""));
    return isNaN(n) ? 0 : n;
};
exports.normalizeNumber = normalizeNumber;
const normalizeDate = (value) => {
    if (!value)
        return null;
    if (typeof value === "number") {
        return new Date(Math.round((value - 25569) * 86400 * 1000));
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
};
exports.normalizeDate = normalizeDate;
const normalizePhones = (value) => {
    const str = (0, exports.toSafeString)(value);
    if (!str)
        return [];
    return str
        .split(/[,/;|\n]/)
        .map(v => v.replace(/\D/g, ""))
        .filter(v => v.length >= 8)
        .map(v => (v.length >= 10 ? v.slice(-10) : v));
};
exports.normalizePhones = normalizePhones;
const normalizeEmails = (value) => {
    const str = (0, exports.toSafeString)(value);
    if (!str)
        return [];
    return str
        .split(/[,/;|\n\s]/)
        .map(v => v.trim())
        .filter(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
};
exports.normalizeEmails = normalizeEmails;
const parseContacts = (row) => {
    const phones = (0, exports.normalizePhones)(row.contactPhone);
    const emails = (0, exports.normalizeEmails)(row.contactEmail);
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
exports.parseContacts = parseContacts;
